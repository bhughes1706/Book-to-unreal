import type { ChapterDraft, PresentationMode, SceneStatus } from "./editor-types";
import { chapterOneScenesFourToNine } from "./chapter-one-scenes-4-9";

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
  npcs: [],
  items: [],
  interactables: [],
  hudEvents: [],
  beats: [],
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
      npcs: [
        {
          id: "ACTOR_MYSTERIOUS_BOY",
          displayName: "Unidentified boy",
          role: "Unexplained visual omen",
          presence: "enters_on_beat",
          behavior: "follow_path",
          entranceBeatId: "BEAT_BOY_RUNS_ACROSS",
          exitBeatId: "BEAT_CONTINUE_ALONE",
          stagingNotes:
            "Run beside the wall with one hand tracing the painted waves; remain unexplained.",
          status: "approved",
        },
      ],
      interactables: [
        {
          id: "INTERACT_PAINTED_WAVES",
          name: "Painted waves",
          kind: "inspection",
          interactionPrompt: "Inspect",
          outcome: "Reveal that the visible waves are deteriorating paint.",
          status: "approved",
        },
      ],
      hudEvents: [
        {
          id: "HUD_WAVES_NOT_REAL",
          channel: "internal_observation",
          text: "The waves aren't real.",
          trigger: "Player inspects the painted waves.",
          dismissMode: "player_dismiss",
          durationSeconds: 0,
          status: "approved",
        },
      ],
      beats: [
        {
          id: "BEAT_OPENING_STILLNESS",
          title: "Opening stillness",
          triggerType: "begin_play",
          triggerTarget: "",
          optional: false,
          actions: [
            {
              id: "ACTION_START_AMBIENCE",
              type: "play_audio",
              targetId: "AUDIO_UNSEEN_WAVES",
              detail: "Hold on unseen waves and wind before enabling movement.",
            },
          ],
          status: "approved",
        },
        {
          id: "BEAT_INSPECT_PAINTED_WAVES",
          title: "Inspect the painted waves",
          triggerType: "interaction",
          triggerTarget: "INTERACT_PAINTED_WAVES",
          optional: false,
          actions: [
            {
              id: "ACTION_SHOW_WAVES_OBSERVATION",
              type: "show_hud",
              targetId: "HUD_WAVES_NOT_REAL",
              detail: "Present as a quiet internal observation.",
            },
          ],
          status: "approved",
        },
        {
          id: "BEAT_BOY_RUNS_ACROSS",
          title: "Boy runs across",
          triggerType: "beat_completed",
          triggerTarget: "BEAT_INSPECT_PAINTED_WAVES",
          optional: false,
          actions: [
            {
              id: "ACTION_SPAWN_BOY",
              type: "spawn_npc",
              targetId: "ACTOR_MYSTERIOUS_BOY",
              detail: "Spawn just outside the camera frame.",
            },
            {
              id: "ACTION_MOVE_BOY",
              type: "move_npc",
              targetId: "ACTOR_MYSTERIOUS_BOY",
              detail: "Run along the wall and exit without explanation.",
            },
          ],
          status: "approved",
        },
        {
          id: "BEAT_CONTINUE_ALONE",
          title: "Continue alone",
          triggerType: "event",
          triggerTarget: "EVENT_BOY_EXITED",
          optional: false,
          actions: [
            {
              id: "ACTION_UNLOCK_DIKE_EXIT",
              type: "unlock_exit",
              targetId: "CH01_S02_DIKE_WALKWAY",
              detail: "Let Grayson continue toward the dike walkway alone.",
            },
          ],
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
      npcs: [
        {
          id: "ACTOR_NOAH",
          displayName: "Noah",
          role: "Companion and protective confidant",
          presence: "enters_on_beat",
          behavior: "follow_player",
          entranceBeatId: "BEAT_NOAH_REJOINS",
          exitBeatId: "",
          stagingNotes:
            "Join near the venue approach so the conversation lands immediately before the reading.",
          status: "needs_discussion",
        },
        {
          id: "ACTOR_VENUE_HOST",
          displayName: "Venue host",
          role: "Minor guide",
          presence: "enters_on_beat",
          behavior: "scripted",
          entranceBeatId: "BEAT_ENTER_VENUE",
          exitBeatId: "",
          stagingNotes:
            "Welcome Grayson enthusiastically and direct him backstage.",
          status: "unreviewed",
        },
      ],
      interactables: [
        {
          id: "INTERACT_VENUE_ENTRANCE",
          name: "Venue entrance",
          kind: "transition",
          interactionPrompt: "Enter",
          outcome: "Complete the approach and move Grayson backstage.",
          status: "unreviewed",
        },
      ],
      hudEvents: [
        {
          id: "HUD_REACH_READING",
          channel: "objective",
          text: "Reach the reading venue.",
          trigger: "The walk toward the venue begins.",
          dismissMode: "beat_advance",
          durationSeconds: 0,
          status: "unreviewed",
        },
      ],
      beats: [
        {
          id: "BEAT_WALK_BEGINS",
          title: "Walk toward the venue",
          triggerType: "begin_play",
          triggerTarget: "",
          optional: false,
          actions: [
            {
              id: "ACTION_SHOW_READING_OBJECTIVE",
              type: "show_hud",
              targetId: "HUD_REACH_READING",
              detail: "Keep the objective understated and non-blocking.",
            },
          ],
          status: "unreviewed",
        },
        {
          id: "BEAT_NOAH_REJOINS",
          title: "Noah rejoins",
          triggerType: "player_enters",
          triggerTarget: "Venue approach",
          optional: false,
          actions: [
            {
              id: "ACTION_SPAWN_NOAH",
              type: "spawn_npc",
              targetId: "ACTOR_NOAH",
              detail: "Bring Noah into frame from the venue side.",
            },
            {
              id: "ACTION_PLAY_NOAH_EXCHANGE",
              type: "play_dialogue",
              targetId: "DIALOGUE_NOAH_DONT_NEED_TO_KNOW",
              detail: "Begin the protected-disclosure conversation.",
            },
          ],
          status: "needs_discussion",
        },
        {
          id: "BEAT_ENTER_VENUE",
          title: "Enter the venue",
          triggerType: "interaction",
          triggerTarget: "INTERACT_VENUE_ENTRANCE",
          optional: false,
          actions: [
            {
              id: "ACTION_INTRODUCE_HOST",
              type: "spawn_npc",
              targetId: "ACTOR_VENUE_HOST",
              detail: "The host welcomes Grayson and directs him backstage.",
            },
            {
              id: "ACTION_UNLOCK_READING",
              type: "unlock_exit",
              targetId: "CH01_S04_BOOK_READING",
              detail: "Advance after the host introduction completes.",
            },
          ],
          status: "unreviewed",
        },
      ],
    },
    ...chapterOneScenesFourToNine,
  ],
};
