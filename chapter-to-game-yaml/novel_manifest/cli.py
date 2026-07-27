from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .compiler import (
    DEFAULT_TARGET,
    ENGINE_TARGETS,
    compile_scene,
    detect_target_name,
    resolve_target,
)
from .diagnostics import Diagnostic
from .loaders import ManifestLoadError, load_yaml
from .validators import (
    validate_chapter_semantics,
    validate_scene_against_chapter,
    validate_scene_semantics,
    validate_schema,
)


def _manifest_kind(document: dict[str, Any]) -> str:
    if document.get("kind") == "scene_manifest" or "runtime" in document:
        return "scene"
    return "chapter"


def _default_schema(schema_dir: Path, kind: str) -> Path:
    return schema_dir / ("scene_manifest.schema.json" if kind == "scene" else "chapter_manifest.schema.json")


def _emit_diagnostics(diagnostics: list[Diagnostic], as_json: bool) -> None:
    if as_json:
        print(json.dumps({"valid": not any(d.severity == "error" for d in diagnostics), "diagnostics": [d.to_dict() for d in diagnostics]}, indent=2))
        return
    if not diagnostics:
        print("VALID")
        return
    for diagnostic in diagnostics:
        print(f"{diagnostic.severity.upper()} {diagnostic.code} {diagnostic.path}: {diagnostic.message}")


def _validate(
    document: dict[str, Any], kind: str, schema: Path, source: Path | None, manifest_path: Path
) -> list[Diagnostic]:
    diagnostics = validate_schema(document, schema)
    if any(item.severity == "error" for item in diagnostics):
        return diagnostics
    if kind == "scene":
        diagnostics.extend(validate_scene_semantics(document))
        diagnostics.extend(validate_scene_against_chapter(document, manifest_path))
    else:
        diagnostics.extend(validate_chapter_semantics(document, source))
    return diagnostics


def command_validate(args: argparse.Namespace) -> int:
    try:
        document = load_yaml(args.manifest)
    except ManifestLoadError as exc:
        print(f"ERROR LOAD $: {exc}", file=sys.stderr)
        return 2
    kind = args.kind if args.kind != "auto" else _manifest_kind(document)
    schema = args.schema or _default_schema(args.schema_dir, kind)
    diagnostics = _validate(document, kind, schema, args.source, args.manifest)
    _emit_diagnostics(diagnostics, args.json)
    return 1 if any(item.severity == "error" for item in diagnostics) else 0


def command_compile(args: argparse.Namespace) -> int:
    try:
        document = load_yaml(args.manifest)
    except ManifestLoadError as exc:
        print(f"ERROR LOAD $: {exc}", file=sys.stderr)
        return 2
    schema = args.schema or _default_schema(args.schema_dir, "scene")
    diagnostics = _validate(document, "scene", schema, None, args.manifest)
    if diagnostics or args.diagnostics_json:
        _emit_diagnostics(diagnostics, args.diagnostics_json)
    if any(item.severity == "error" for item in diagnostics):
        return 1

    target_name = args.target
    if target_name == "auto":
        target_name = detect_target_name(document) or DEFAULT_TARGET
    try:
        target = resolve_target(target_name)
    except ValueError as exc:
        print(f"ERROR TARGET $: {exc}", file=sys.stderr)
        return 2

    compiled = compile_scene(document, target)
    payload = json.dumps(compiled, indent=2 if args.pretty else None, ensure_ascii=False, sort_keys=args.sort_keys) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(payload, encoding="utf-8")
    if not args.quiet:
        print(f"COMPILED {document['scene_id']} -> {args.output} [engine: {target.name}]")
        print(f"Beats: {len(compiled['runtime']['beats'])}; source hash: {compiled['source']['canonicalSha256']}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    package_root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(prog="novel-manifest", description="Validate and compile novel game manifests.")
    parser.add_argument("--schema-dir", type=Path, default=package_root / "schemas", help="directory containing default schemas")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="validate a chapter or scene YAML manifest")
    validate.add_argument("manifest", type=Path)
    validate.add_argument("--kind", choices=("auto", "chapter", "scene"), default="auto")
    validate.add_argument("--schema", type=Path)
    validate.add_argument("--source", type=Path, help="chapter source DOCX/TXT for source-anchor checks")
    validate.add_argument("--json", action="store_true", help="emit machine-readable diagnostics")
    validate.set_defaults(handler=command_validate)

    compile_parser = subparsers.add_parser("compile", help="validate and compile a focused scene YAML to normalized JSON")
    compile_parser.add_argument("manifest", type=Path)
    compile_parser.add_argument("--output", "-o", type=Path, required=True)
    compile_parser.add_argument(
        "--target",
        choices=("auto", *sorted(ENGINE_TARGETS)),
        default="auto",
        help="engine target for units/axes/naming; 'auto' reads design.engine, else unreal",
    )
    compile_parser.add_argument("--schema", type=Path)
    compile_parser.add_argument("--pretty", action=argparse.BooleanOptionalAction, default=True)
    compile_parser.add_argument("--sort-keys", action="store_true")
    compile_parser.add_argument("--quiet", action="store_true")
    compile_parser.add_argument("--diagnostics-json", action="store_true")
    compile_parser.set_defaults(handler=command_compile)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
