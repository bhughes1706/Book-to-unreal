import type { ChapterDraft, PresentationMode, SceneStatus } from "./editor-types";

const scene = (
  id: string,
  order: number,
  title: string,
  playerGoal: string,
  presentationMode: PresentationMode,
  status: SceneStatus = "draft",
): ChapterDraft["scenes"][number] => ({
  id,
  order,
  title,
  timeContext: "Night",
  status,
  presentationMode,
  playerGoal,
  sourceExcerpt: "",
  dialogue: [],
  storyChanges: [],
  notes: "",
});

export const chapterSeed: ChapterDraft = {
  id: "CH01",
  title: "One",
  sourceFilename: "Ch1.docx",
  scenes: [
    {
      ...scene(
        "CH01_S01_DIKE_BEACH",
        1,
        "Painted Waves",
        "Absorb the scene and discover that the visible waves are only paint.",
        "scrolling_hd2d",
        "approved",
      ),
      sourceExcerpt:
        "The waves aren’t real. They were painted on the concrete dike from some distant memory. Real waves move and crash and dance and shimmer, but these waves are stationary and disintegrating.\n\nNoah sits next to me with his arms around his legs and his chin on his knees. He stares ahead at the painted waves, listening to the ever-crashing on the other side of that concrete dike.\n\n“Want to walk up there?” He asks, pointing to the stairs that zigzag to the top of the dike. I nod. He hands me a cigarette and I light it.\n\nA boy walks in front of us. I can’t say where he came from, but he’s suddenly there. He walks beside the dike with one hand outstretched, dragging his fingers against the concrete.",
      dialogue: [
        {
          id: "DIALOGUE_NOAH_WALK_UP",
          speaker: "Noah",
          text: "Want to walk up there?",
          sourceLocked: true,
          status: "approved",
        },
      ],
      storyChanges: [
        {
          id: "CHANGE_NOAH_ENTRY_ORDER",
          type: "character_entry_order",
          canonical:
            "Noah is present on the beach before the boy appears and climbs the dike with Grayson.",
          proposed:
            "Grayson begins alone. Noah first appears when Grayson reaches the reading venue.",
          rationale:
            "Preserve the opening isolation and make companionship a clear emotional shift.",
          status: "approved",
        },
      ],
    },
    {
      ...scene(
        "CH01_S02_DIKE_WALKWAY",
        2,
        "The Black Ocean",
        "Cross the dike while processing a distant death that the city treats as routine.",
        "scrolling_hd2d",
        "needs_author_review",
      ),
      sourceExcerpt:
        "The dike meanders down the beach, one half the buzzing white electric of the city, the other half the consuming dark nothingness of the ocean.\n\nThere’s a boardwalk jutting out into the ocean. It’s lit with solar lights, creating a yellow line that defiantly pierces the blackness surrounding it. A man stands at the end of that boardwalk.\n\nI stare at that man. I stare at him until he disappears into the night.",
    },
    {
      ...scene(
        "CH01_S03_WALK_TO_VENUE",
        3,
        "Toward the Reading",
        "Reach the venue despite Grayson’s reluctance.",
        "scrolling_hd2d",
        "needs_author_review",
      ),
      sourceExcerpt:
        "“Are you okay?” He asks while walking toward a brown building that appears asleep in the bustling city.\n\n“No. I don’t think I am.” I say, but don’t look at him.\n\n“They don’t need to know.” Noah says. “Why you wrote it is none of their concern.”\n\n“That makes me feel like a fake, a liar.”\n\n“What if I tell them why I wrote it?” I say as we begin following the solar sidewalk on the other side of the Rails.\n\n“Then they won’t understand your book, they’ll put it in that box and it won’t be the same.”",
      dialogue: [
        {
          id: "DIALOGUE_NOAH_DONT_NEED_TO_KNOW",
          speaker: "Noah",
          text: "They don’t need to know. Why you wrote it is none of their concern.",
          sourceLocked: true,
          status: "approved",
        },
        {
          id: "DIALOGUE_GRAYSON_FAKE",
          speaker: "Grayson",
          text: "That makes me feel like a fake, a liar.",
          sourceLocked: true,
          status: "unreviewed",
          playerChoice: {
            id: "CHOICE_DISCLOSE_BOOK_REASON",
            prompt: "How does Grayson answer Noah?",
            canonicalBounds:
              "The reading still happens. The choice changes Grayson’s expressed intent and relationship state, not the chapter’s event order.",
            status: "needs_discussion",
            options: [
              {
                id: "OPTION_TELL_THE_TRUTH",
                label: "I should tell them the truth.",
                effect:
                  "Grayson leans toward disclosure and challenges Noah’s protective instinct.",
                effectScopes: ["self_definition", "relationship"],
              },
              {
                id: "OPTION_KEEP_IT_PRIVATE",
                label: "Maybe it is none of their concern.",
                effect:
                  "Grayson accepts the performance boundary while carrying the discomfort forward.",
                effectScopes: ["self_definition", "scene_variation"],
              },
            ],
          },
        },
      ],
      storyChanges: [
        {
          id: "CHANGE_NOAH_REJOINS_AT_VENUE",
          type: "character_entry_order",
          canonical: "Noah accompanies Grayson from the beach toward the venue.",
          proposed:
            "Grayson travels alone; Noah joins him at the venue approach so this dialogue moves closer to the reading.",
          rationale:
            "Protect the approved solitary opening while retaining the conversation’s function.",
          status: "needs_discussion",
        },
      ],
    },
    scene(
      "CH01_S04_BOOK_READING",
      4,
      "The Comedy Performance",
      "Complete the reading while noticing the audience’s mediated attention.",
      "static_cinematic",
    ),
    scene(
      "CH01_S05_BACK_ALLEY",
      5,
      "After the Applause",
      "Move from performance to private banter.",
      "static_cinematic",
    ),
    scene(
      "CH01_S06_RAIL_JOURNEY",
      6,
      "Converted Temples",
      "Absorb visual worldbuilding without stopping the chapter.",
      "scrolling_hd2d",
    ),
    scene(
      "CH01_S07_HOTEL_BAR",
      7,
      "Real Whiskey",
      "Decide how Grayson deflects while being drawn out of control.",
      "static_cinematic",
    ),
    scene(
      "CH01_S08_NIGHT_WALK",
      8,
      "Fortunes",
      "Share a vice-driven interlude and receive an ambiguous promise.",
      "scrolling_hd2d",
    ),
    scene(
      "CH01_S09_CONSTRUCTION_TOWER",
      9,
      "Above the City",
      "Reach a place where silence and isolation feel restorative rather than empty.",
      "static_cinematic",
    ),
  ],
};
