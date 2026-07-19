import type { SceneDraft } from "./editor-types";

export const chapterOneScenesFourToNine: SceneDraft[] = [
  {
    id: "CH01_S04_BOOK_READING",
    order: 4,
    title: "The Comedy Performance",
    timeContext: "Night",
    status: "needs_author_review",
    presentationMode: "static_cinematic",
    playerGoal:
      "Complete the reading while noticing the audience’s mediated attention.",
    sourceExcerpt:
      "I push past the curtain and the room is indeed full of patient faces. Some are talking to one another in hushed tones, but most stare silently at the stage, looking at news on their Lens or adding images to their social media pages.\n\nI stand on a small stage. It’s a small venue and there’s a small mic next to the stool I’ll use when my feet begin to hurt. The lights are low and my white face is highlighted against a black curtain background.\n\n“My name is Grayson Ochs and I write comedy.” I say into the mic. Several people clap. More and more people begin looking at the stage until everyone is welcoming me.\n\nMy mouth is dry and my eyes hurt. I finish the reading and I’m asking the audience if they have any questions. The audience laughed at the parts they were supposed to laugh at, but I couldn’t find the humor in any of this.\n\nA woman with tornado hair and stance all akimbo stands up and doesn’t wait for me to point. “I was especially intrigued by the section on how to structure a babies diet. Would it be beneficial to select dirt from a bunch of different locations to add more bacteria to your baby’s diet?”\n\nI tell the crowd thank you and leave the stage to applause.",
    dialogue: [
      {
        id: "DIALOGUE_GRAYSON_COMEDY_INTRO",
        speaker: "Grayson",
        text: "My name is Grayson Ochs and I write comedy.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_AUDIENCE_PARODY_QUESTION",
        speaker: "Audience member",
        text: "Is there a reason you decided to write a parody book on parenting?",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_HARD_SCIENCE",
        speaker: "Grayson",
        text: "Who said it was parody? This is hard science.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WHISKEY_WOMAN_BACTERIA",
        speaker: "Unnamed woman",
        text: "Would it be beneficial to select dirt from a bunch of different locations to add more bacteria to your baby’s diet?",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_BABY_STRONG",
        speaker: "Grayson",
        text: "I’m thinking of making a food corporation with all the needed dirt and diseases in it. I’ll call it ‘Baby Strong Inc.’",
        sourceLocked: true,
        status: "unreviewed",
      },
    ],
    storyChanges: [
      {
        id: "CHANGE_NOAH_FIRST_APPEARANCE",
        type: "character_first_appearance",
        canonical:
          "Noah has accompanied Grayson since the beach and is waiting when the reading ends.",
        proposed:
          "Noah’s first game appearance occurs at the reading venue, immediately before or during the backstage transition.",
        rationale:
          "Preserve the author-approved solitary opening while placing Noah at the point where his support becomes dramatically active.",
        status: "approved",
      },
    ],
    npcs: [
      {
        id: "ACTOR_WHISKEY_WOMAN",
        displayName: "Unnamed woman",
        role: "Distinctive audience member who challenges Grayson",
        presence: "present_at_start",
        behavior: "idle",
        entranceBeatId: "",
        exitBeatId: "BEAT_APPLAUSE_TRANSITION",
        stagingNotes:
          "Keep her tornado-like hair and asymmetrical stance readable in silhouette; do not name her.",
        status: "unreviewed",
      },
      {
        id: "ACTOR_AUDIENCE_QUESTIONER",
        displayName: "Audience questioner",
        role: "Japanese attendee whose question establishes Lens translation",
        presence: "present_at_start",
        behavior: "stationary",
        entranceBeatId: "",
        exitBeatId: "BEAT_APPLAUSE_TRANSITION",
        stagingNotes:
          "Rise from the audience after the reading montage and speak Japanese while the translated line is heard.",
        status: "unreviewed",
      },
      {
        id: "ACTOR_NOAH",
        displayName: "Noah",
        role: "Grayson’s companion and first backstage support",
        presence: "enters_on_beat",
        behavior: "scripted",
        entranceBeatId: "BEAT_APPLAUSE_TRANSITION",
        exitBeatId: "",
        stagingNotes:
          "Appear at the backstage edge with water as applause carries through the curtain.",
        status: "unreviewed",
      },
    ],
    items: [],
    interactables: [
      {
        id: "INTERACT_STAGE_MICROPHONE",
        name: "Stage microphone",
        kind: "prop",
        interactionPrompt: "Begin the reading",
        outcome: "Commit Grayson to the performance and start the reading montage.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_AUDIENCE_LENSES",
        name: "Audience Lens glow",
        kind: "inspection",
        interactionPrompt: "Observe",
        outcome:
          "Notice moving Lens colors and the audience’s divided attention.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_STAGE_STOOL",
        name: "Stage stool",
        kind: "prop",
        interactionPrompt: "Sit",
        outcome:
          "Change Grayson’s delivery pose without changing the reading’s outcome.",
        status: "unreviewed",
      },
    ],
    hudEvents: [
      {
        id: "HUD_STAGE_DOUBT",
        channel: "internal_observation",
        text: "They’re receiving scraps of myself and I feel like a conman.",
        trigger: "Grayson observes the Lens-lit audience before speaking.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        status: "unreviewed",
      },
      {
        id: "HUD_QA_TRANSLATION",
        channel: "translation",
        text: "Is there a reason you decided to write a parody book on parenting?",
        trigger: "The first audience question is spoken in Japanese.",
        dismissMode: "beat_advance",
        durationSeconds: 0,
        status: "unreviewed",
      },
    ],
    beats: [
      {
        id: "BEAT_CURTAIN_ANXIETY",
        title: "Curtain anxiety",
        triggerType: "begin_play",
        triggerTarget: "",
        optional: false,
        actions: [
          {
            id: "ACTION_FRAME_CURTAIN_FANTASIES",
            type: "camera",
            targetId: "CURTAIN_ANXIETY_OVERLAYS",
            detail:
              "Flash empty, hostile, and burning-room possibilities without presenting them as real events.",
          },
          {
            id: "ACTION_SHOW_STAGE_DOUBT",
            type: "show_hud",
            targetId: "HUD_STAGE_DOUBT",
            detail:
              "Let the internal observation sit against the distracted audience.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_READING_START",
        title: "Take the stage",
        triggerType: "interaction",
        triggerTarget: "INTERACT_STAGE_MICROPHONE",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_COMEDY_INTRO",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_COMEDY_INTRO",
            detail: "Deliver into a dry microphone before applause grows.",
          },
          {
            id: "ACTION_RUN_READING_MONTAGE",
            type: "custom",
            targetId: "READING_MONTAGE",
            detail:
              "Compress the hour-long reading while laughter becomes emotionally detached.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_AUDIENCE_QUESTIONS",
        title: "Open audience questions",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_GRAYSON_COMEDY_INTRO",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_PARODY_QUESTION",
            type: "play_dialogue",
            targetId: "DIALOGUE_AUDIENCE_PARODY_QUESTION",
            detail: "The attendee speaks Japanese from the dark audience.",
          },
          {
            id: "ACTION_SHOW_QA_TRANSLATION",
            type: "show_hud",
            targetId: "HUD_QA_TRANSLATION",
            detail: "Present the Lens translation cleanly and without fanfare.",
          },
          {
            id: "ACTION_PLAY_HARD_SCIENCE",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_HARD_SCIENCE",
            detail: "Land the source joke and allow the expected laugh.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_WOMAN_QUESTION",
        title: "The unnamed woman stands",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_GRAYSON_HARD_SCIENCE",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_BACTERIA_QUESTION",
            type: "play_dialogue",
            targetId: "DIALOGUE_WHISKEY_WOMAN_BACTERIA",
            detail:
              "Isolate her silhouette enough to support recognition in the hotel bar.",
          },
          {
            id: "ACTION_PLAY_BABY_STRONG",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_BABY_STRONG",
            detail:
              "Keep Grayson’s public comic rhythm intact while his affect stays distant.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_APPLAUSE_TRANSITION",
        title: "Leave to applause",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_GRAYSON_BABY_STRONG",
        optional: false,
        actions: [
          {
            id: "ACTION_SPAWN_NOAH_BACKSTAGE",
            type: "spawn_npc",
            targetId: "ACTOR_NOAH",
            detail:
              "Reveal Noah with a glass of water as Grayson clears the curtain.",
          },
          {
            id: "ACTION_UNLOCK_BACK_ALLEY",
            type: "unlock_exit",
            targetId: "CH01_S05_BACK_ALLEY",
            detail:
              "Carry applause into the quieter backstage space before loading the alley scene.",
          },
        ],
        status: "unreviewed",
      },
    ],
    notes:
      "Preserve the woman’s anonymity and the contrast between successful comedy and Grayson’s private grief. The author-approved Noah entry change remains locked in the adaptation ledger.",
  },
  {
    id: "CH01_S05_BACK_ALLEY",
    order: 5,
    title: "After the Applause",
    timeContext: "Night",
    status: "needs_author_review",
    presentationMode: "static_cinematic",
    playerGoal: "Move from performance to private banter.",
    sourceExcerpt:
      "Noah hands me a glass of water and I drink it eagerly. He smiles at me and I know he’s pleased with the reading.\n\n“How was it?” I ask.\n\n“You were fantastic.” He says.\n\n“Smoke in the back alley?” I say.\n\nWe stand in the alley and the cigarette makes all the stress a little fuzzier.\n\n“Why Japan?” I ask him.\n\n“Because Japan is the most over populated former-country on earth.”\n\n“There’s a stress in the population that your book will reach.” Noah informs me in his best scholarly impression.\n\n“You’re a baboon.”\n\n“Joke’s on you; they’re extinct.” I think for a moment. “Or, perhaps, the joke is on them.”",
    dialogue: [
      {
        id: "DIALOGUE_NOAH_FANTASTIC",
        speaker: "Noah",
        text: "You were fantastic.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_WHY_JAPAN",
        speaker: "Grayson",
        text: "Why Japan?",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_NOAH_POPULATION_STRESS",
        speaker: "Noah",
        text: "There’s a stress in the population that your book will reach.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_EXTINCT_BABOON",
        speaker: "Grayson",
        text: "Joke’s on you; they’re extinct. Or, perhaps, the joke is on them.",
        sourceLocked: true,
        status: "unreviewed",
      },
    ],
    storyChanges: [],
    npcs: [
      {
        id: "ACTOR_NOAH",
        displayName: "Noah",
        role: "Supportive friend and comic foil",
        presence: "present_at_start",
        behavior: "follow_player",
        entranceBeatId: "",
        exitBeatId: "BEAT_BOARD_RAIL",
        stagingNotes:
          "Move from backstage reassurance into relaxed alley banter, then accompany Grayson to the Rail.",
        status: "unreviewed",
      },
      {
        id: "ACTOR_VENUE_ASSISTANT",
        displayName: "Venue assistant",
        role: "Backstage attendant",
        presence: "present_at_start",
        behavior: "stationary",
        entranceBeatId: "",
        exitBeatId: "BEAT_ALLEY_SMOKE",
        stagingNotes:
          "Remain eager and slightly awkward; do not compete with the exchange between Grayson and Noah.",
        status: "unreviewed",
      },
      {
        id: "ACTOR_DEPARTING_PATRONS",
        displayName: "Departing patrons",
        role: "Background crowd clearing the venue district",
        presence: "present_at_start",
        behavior: "follow_path",
        entranceBeatId: "",
        exitBeatId: "BEAT_BOARD_RAIL",
        stagingNotes:
          "Thin out gradually so the Rail transition feels earned rather than timer-driven.",
        status: "unreviewed",
      },
    ],
    items: [
      {
        id: "ITEM_LIFE_BRACELET",
        name: "Life Bracelet",
        kind: "personal_item",
        initialState: "held",
        persistence: "chapter",
        interactionPrompt: "Check tracking light",
        outcome:
          "Reveal the red GPS indicator and the cost attached to universal basic income.",
        status: "unreviewed",
      },
    ],
    interactables: [
      {
        id: "INTERACT_WATER_GLASS",
        name: "Glass of water",
        kind: "prop",
        interactionPrompt: "Drink",
        outcome:
          "Ground the post-performance exhaustion before Noah offers praise.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_ALLEY_CIGARETTE",
        name: "Alley cigarette",
        kind: "prop",
        interactionPrompt: "Light cigarette",
        outcome: "Begin the private Japan and population conversation.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_RAIL_PLATFORM",
        name: "Rail platform",
        kind: "transition",
        interactionPrompt: "Board Rail",
        outcome: "Leave the venue district after the patrons clear.",
        status: "unreviewed",
      },
    ],
    hudEvents: [
      {
        id: "HUD_BRACELET_TRACKING",
        channel: "internal_observation",
        text: "GPS is tracking it. All my movements are recorded.",
        trigger: "Grayson checks the red light on his Bracelet.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        status: "unreviewed",
      },
    ],
    beats: [
      {
        id: "BEAT_POST_SHOW",
        title: "Recover backstage",
        triggerType: "begin_play",
        triggerTarget: "",
        optional: false,
        actions: [
          {
            id: "ACTION_DRINK_BACKSTAGE_WATER",
            type: "update_interactable",
            targetId: "INTERACT_WATER_GLASS",
            detail:
              "Have Grayson drink eagerly while the venue empties behind him.",
          },
          {
            id: "ACTION_PLAY_NOAH_PRAISE",
            type: "play_dialogue",
            targetId: "DIALOGUE_NOAH_FANTASTIC",
            detail:
              "Let the compliment land into silence rather than a triumphant response.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_ALLEY_SMOKE",
        title: "Step into the alley",
        triggerType: "interaction",
        triggerTarget: "INTERACT_ALLEY_CIGARETTE",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_WHY_JAPAN",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_WHY_JAPAN",
            detail:
              "Start the walk-and-talk once the cigarette softens the post-show tension.",
          },
          {
            id: "ACTION_PLAY_POPULATION_CONTEXT",
            type: "play_dialogue",
            targetId: "DIALOGUE_NOAH_POPULATION_STRESS",
            detail:
              "Connect the satire to population pressure without stopping traversal.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_CHECK_BRACELET",
        title: "Notice the tracking light",
        triggerType: "item_used",
        triggerTarget: "ITEM_LIFE_BRACELET",
        optional: true,
        actions: [
          {
            id: "ACTION_SHOW_BRACELET_TRACKING",
            type: "show_hud",
            targetId: "HUD_BRACELET_TRACKING",
            detail:
              "Keep the observation brief while the Rail queue forms in the background.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_BOARD_RAIL",
        title: "Board the Rail",
        triggerType: "interaction",
        triggerTarget: "INTERACT_RAIL_PLATFORM",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_EXTINCTION_JOKE",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_EXTINCT_BABOON",
            detail: "End the alley exchange on the source’s extinction joke.",
          },
          {
            id: "ACTION_UNLOCK_RAIL_JOURNEY",
            type: "unlock_exit",
            targetId: "CH01_S06_RAIL_JOURNEY",
            detail:
              "Transition after the last patrons leave and Grayson and Noah sit down.",
          },
        ],
        status: "unreviewed",
      },
    ],
    notes:
      "Keep the drug references in dialogue and environmental context rather than turning them into rewarded gameplay. Preserve the ordinary, quiet scale of the alley.",
  },
  {
    id: "CH01_S06_RAIL_JOURNEY",
    order: 6,
    title: "Converted Temples",
    timeContext: "Night",
    status: "needs_author_review",
    presentationMode: "scrolling_hd2d",
    playerGoal: "Absorb visual worldbuilding without stopping the chapter.",
    sourceExcerpt:
      "We sit down on worn seats, the stitching mimicking real leather.\n\nThe rail speeds past huge residential housing that used to be shopping malls. After the water began rising and the internet took over supplying everyone’s needs, there was a renewed focus on recycling all the empty stores. Climate refugees received vast amounts of crypto-credits from the Leaders for their losses and looked to buy real estate. Old shopping malls were quickly converted and sold off, some malls supplied thousands of units to small and single households. The old temples of over consumption ended up supplying climate refugees with living spaces, the poetic justice was evident and acceptable to everyone, while the rich lined their pockets off the climate migration.\n\nThe Rail slows in front of our skyscraper hotel.\n\n“Drink at the bar?” I ask Noah as we step out.\n\n“I’m going to try that new morphine I ordered and simply relax on the balcony.”",
    dialogue: [
      {
        id: "DIALOGUE_GRAYSON_DRINK_AT_BAR",
        speaker: "Grayson",
        text: "Drink at the bar?",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_NOAH_BALCONY_MORPHINE",
        speaker: "Noah",
        text: "I’m going to try that new morphine I ordered and simply relax on the balcony.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_REFINED_PLEASURE",
        speaker: "Grayson",
        text: "Your a man of refined recreational pleasure.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_NOAH_SEE_TOMORROW",
        speaker: "Noah",
        text: "See you tomorrow.",
        sourceLocked: true,
        status: "unreviewed",
      },
    ],
    storyChanges: [],
    npcs: [
      {
        id: "ACTOR_NOAH",
        displayName: "Noah",
        role: "Travel companion who separates from Grayson at the hotel",
        presence: "present_at_start",
        behavior: "idle",
        entranceBeatId: "",
        exitBeatId: "BEAT_HOTEL_ARRIVAL",
        stagingNotes:
          "Sit opposite or beside Grayson during transit, then peel toward the elevators at the hotel.",
        status: "unreviewed",
      },
    ],
    items: [],
    interactables: [
      {
        id: "INTERACT_RAIL_WINDOW",
        name: "Rail window",
        kind: "inspection",
        interactionPrompt: "Watch the city",
        outcome:
          "Reveal converted shopping-mall housing in readable parallax layers.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_WORN_RAIL_SEAT",
        name: "Worn synthetic-leather seat",
        kind: "inspection",
        interactionPrompt: "Inspect stitching",
        outcome:
          "Establish the carriage’s imitated material and worn public infrastructure.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_HOTEL_EXIT",
        name: "Hotel station exit",
        kind: "transition",
        interactionPrompt: "Step out",
        outcome: "End the transit sequence at the skyscraper hotel.",
        status: "unreviewed",
      },
    ],
    hudEvents: [
      {
        id: "HUD_CONVERTED_TEMPLES",
        channel: "internal_observation",
        text: "The old temples of overconsumption became homes, while the rich profited from the migration.",
        trigger: "Grayson watches the converted mall district pass the window.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        status: "unreviewed",
      },
    ],
    beats: [
      {
        id: "BEAT_TRANSIT_BEGINS",
        title: "Settle into the carriage",
        triggerType: "begin_play",
        triggerTarget: "",
        optional: false,
        actions: [
          {
            id: "ACTION_START_RAIL_PARALLAX",
            type: "camera",
            targetId: "RAIL_CARRIAGE_PARALLAX",
            detail:
              "Hold the carriage in the foreground while the city begins moving behind it.",
          },
          {
            id: "ACTION_START_RAIL_AUDIO",
            type: "play_audio",
            targetId: "AUDIO_RAIL_MOTOR",
            detail:
              "Use track rhythm and motor tone as the scene’s pacing bed.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_MALL_HOUSING",
        title: "Observe the converted malls",
        triggerType: "interaction",
        triggerTarget: "INTERACT_RAIL_WINDOW",
        optional: false,
        actions: [
          {
            id: "ACTION_REVEAL_MALL_HOUSING",
            type: "camera",
            targetId: "CONVERTED_MALL_BACKDROP",
            detail:
              "Expose store shells converted into dense housing before adding text.",
          },
          {
            id: "ACTION_SHOW_CONVERTED_TEMPLES",
            type: "show_hud",
            targetId: "HUD_CONVERTED_TEMPLES",
            detail:
              "Let the visual transformation carry most of the exposition.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_HOTEL_ARRIVAL",
        title: "Arrive at the hotel",
        triggerType: "interaction",
        triggerTarget: "INTERACT_HOTEL_EXIT",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_BAR_INVITATION",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_DRINK_AT_BAR",
            detail: "Begin as the Rail doors open.",
          },
          {
            id: "ACTION_PLAY_NOAH_PLANS",
            type: "play_dialogue",
            targetId: "DIALOGUE_NOAH_BALCONY_MORPHINE",
            detail:
              "Send Noah toward the elevators and Grayson toward the bar.",
          },
          {
            id: "ACTION_UNLOCK_HOTEL_BAR",
            type: "unlock_exit",
            targetId: "CH01_S07_HOTEL_BAR",
            detail: "Transition once Noah and Grayson separate.",
          },
        ],
        status: "unreviewed",
      },
    ],
    notes:
      "Keep this scene low-input. The exterior transformation should communicate adaptation and exploitation before the observation text appears.",
  },
  {
    id: "CH01_S07_HOTEL_BAR",
    order: 7,
    title: "Real Whiskey",
    timeContext: "Night",
    status: "needs_author_review",
    presentationMode: "static_cinematic",
    playerGoal:
      "Decide how Grayson deflects while being drawn out of control.",
    sourceExcerpt:
      "Noah walks toward the elevators while I turn in the direction of the bar, an area of the hotel illuminated by a million watts of purple light. Most of the customers sit by themselves, staring ahead into the whirling flames without actually seeing them.\n\nA woman sits down next to me, despite all the empty seats around the bar.\n\n“No! Whiskey. Real whiskey. Not whatever that is.”\n\n“To hangovers.”\n\n“Because it’s refreshing to have someone lie to everyone.”\n\n“We all lie to ourselves, all the time, how can we be honest with anyone else? Maybe we lie so much that we forget who we really are.”\n\n“Who are you?”\n\n“I’m just a writer.”\n\n“See? You forgot how much fun it is not to be in control all the time.”\n\n“Let’s go.” She grabs the bottle from the bar and begins to walk away.",
    dialogue: [
      {
        id: "DIALOGUE_WOMAN_REAL_WHISKEY",
        speaker: "Unnamed woman",
        text: "No! Whiskey. Real whiskey. Not whatever that is.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_TO_HANGOVERS",
        speaker: "Grayson",
        text: "To hangovers.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_REFRESHING_LIE",
        speaker: "Unnamed woman",
        text: "Because it’s refreshing to have someone lie to everyone.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_ALL_LIES",
        speaker: "Unnamed woman",
        text: "We all lie to ourselves, all the time, how can we be honest with anyone else? Maybe we lie so much that we forget who we really are.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_WHO_ARE_YOU",
        speaker: "Unnamed woman",
        text: "Who do I think I am? I’m just a girl who likes whiskey. Who are you?",
        sourceLocked: true,
        status: "unreviewed",
        playerChoice: {
          id: "CHOICE_GRAYSON_BAR_IDENTITY",
          prompt: "How does Grayson answer her?",
          canonicalBounds:
            "The woman still challenges his self-description, takes the bottle, and leads him into the street. The choice changes expressed vulnerability, not the scene outcome.",
          status: "needs_discussion",
          options: [
            {
              id: "OPTION_WRITER_DEFLECTION",
              label: "I’m just a writer.",
              effect:
                "Preserve the source answer and keep Grayson’s identity at a defensive distance.",
              effectScopes: ["self_definition", "relationship"],
            },
            {
              id: "OPTION_ADMIT_UNCERTAINTY",
              label: "I don’t know who I am.",
              effect:
                "Let Grayson briefly admit uncertainty before the woman pushes him toward surrendering control.",
              effectScopes: ["relationship", "scene_variation"],
            },
          ],
        },
      },
      {
        id: "DIALOGUE_WOMAN_LOSS_OF_CONTROL",
        speaker: "Unnamed woman",
        text: "See? You forgot how much fun it is not to be in control all the time.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_LETS_GO",
        speaker: "Unnamed woman",
        text: "Let’s go.",
        sourceLocked: true,
        status: "unreviewed",
      },
    ],
    storyChanges: [
      {
        id: "CHANGE_BAR_IDENTITY_BRANCH",
        type: "dialogue_branch",
        canonical:
          "Grayson answers that he is just a writer, and the woman immediately challenges whether that is who he really is.",
        proposed:
          "Let the player preserve the writer deflection or briefly admit that Grayson no longer knows who he is.",
        rationale:
          "Give the player expressive control at the conversation’s central identity question without changing the decision to follow the woman.",
        status: "needs_discussion",
      },
    ],
    npcs: [
      {
        id: "ACTOR_WHISKEY_WOMAN",
        displayName: "Unnamed woman",
        role: "Provocateur who challenges Grayson’s controlled persona",
        presence: "enters_on_beat",
        behavior: "scripted",
        entranceBeatId: "BEAT_WOMAN_SITS",
        exitBeatId: "BEAT_LEAVE_WITH_BOTTLE",
        stagingNotes:
          "Use the purple/fire split light, tornado-like hair, and eyes without Lens color. Preserve her lack of a name.",
        status: "unreviewed",
      },
      {
        id: "ACTOR_BARTENDER",
        displayName: "Bartender",
        role: "Quiet facilitator of the escalating whiskey exchange",
        presence: "present_at_start",
        behavior: "stationary",
        entranceBeatId: "",
        exitBeatId: "",
        stagingNotes:
          "React minimally, using looks toward Grayson to ask for consent and payment.",
        status: "unreviewed",
      },
      {
        id: "ACTOR_LENS_PATRON",
        displayName: "Lens-absorbed patron",
        role: "Environmental contrast to the unnamed woman",
        presence: "present_at_start",
        behavior: "stationary",
        entranceBeatId: "",
        exitBeatId: "",
        stagingNotes:
          "Sit impossibly upright with projected colors moving across the irises.",
        status: "unreviewed",
      },
    ],
    items: [
      {
        id: "ITEM_LIFE_BRACELET",
        name: "Life Bracelet",
        kind: "personal_item",
        initialState: "held",
        persistence: "chapter",
        interactionPrompt: "Pay",
        outcome:
          "Pay for the bottle and underline that real whiskey costs less than the synthetic cocktail.",
        status: "unreviewed",
      },
    ],
    interactables: [
      {
        id: "INTERACT_SYNTH_COCKTAIL",
        name: "Synthetic lime cocktail",
        kind: "prop",
        interactionPrompt: "Take a drink",
        outcome: "Invite the unnamed woman’s criticism and begin the encounter.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_REAL_WHISKEY_BOTTLE",
        name: "Real whiskey bottle",
        kind: "prop",
        interactionPrompt: "Pour real whiskey",
        outcome:
          "Replace synthetic safety with an uncontrolled, physically felt experience.",
        status: "unreviewed",
      },
    ],
    hudEvents: [
      {
        id: "HUD_WOMAN_NO_LENS",
        channel: "internal_observation",
        text: "No colors dance inside her irises.",
        trigger: "Grayson studies the woman across the purple and orange light.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        status: "unreviewed",
      },
      {
        id: "HUD_BAR_CHOICE_CONSEQUENCE",
        channel: "choice_consequence",
        text: "She heard the part of the answer he usually keeps hidden.",
        trigger: "The player chooses how Grayson defines himself.",
        dismissMode: "beat_advance",
        durationSeconds: 0,
        status: "unreviewed",
      },
      {
        id: "LENS_SYSTEM_NOTIFICATION_CONGRATULATE_DIVER_FAMILY",
        channel: "system_notification",
        text:
          "Registered diver status confirmed. Would you like to congratulate the beneficiary family?",
        trigger:
          "The Life Bracelet network confirms the pier diver’s registered death while Grayson is in the hotel bar.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        eventThreadId: "EVENT_PIER_DIVER_FAMILY_PAYOUT",
        eventThreadRole: "callback",
        eventThreadNote:
          "The state converts the distant death Grayson witnessed into a polite social prompt.",
        responses: [
          {
            id: "GRAYSON_RESPONSE_CONGRATULATE_FAMILY",
            label: "Congratulate the family",
            outcome:
              "Send the state-authored condolence and congratulations message through the Lens.",
            setFlag: "FLAG_DIVER_FAMILY_CONGRATULATED",
          },
          {
            id: "GRAYSON_RESPONSE_DISMISS_DIVER_NOTICE",
            label: "Dismiss",
            outcome:
              "Close the prompt without contacting the beneficiary family.",
            setFlag: "FLAG_DIVER_FAMILY_NOTICE_DISMISSED",
          },
        ],
        status: "needs_discussion",
      },
    ],
    beats: [
      {
        id: "BEAT_NOAH_DEPARTS",
        title: "Enter the purple bar",
        triggerType: "begin_play",
        triggerTarget: "",
        optional: false,
        actions: [
          {
            id: "ACTION_FRAME_PURPLE_BAR",
            type: "camera",
            targetId: "PURPLE_ORANGE_BAR_WIDE",
            detail:
              "Establish isolated patrons, the wall of fire, and Grayson’s empty neighboring seats.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "SCENE_BEAT_DIVER_FAMILY_NOTIFICATION",
        title: "The state confirms the pier diver",
        triggerType: "beat_completed",
        triggerTarget: "BEAT_NOAH_DEPARTS",
        optional: false,
        actions: [
          {
            id: "ACTION_SHOW_DIVER_FAMILY_NOTIFICATION",
            type: "show_hud",
            targetId:
              "LENS_SYSTEM_NOTIFICATION_CONGRATULATE_DIVER_FAMILY",
            detail:
              "Interrupt the warm bar lighting with a polite state prompt that reduces the witnessed death to a social transaction.",
          },
        ],
        status: "needs_discussion",
      },
      {
        id: "BEAT_WOMAN_SITS",
        title: "The woman takes the next seat",
        triggerType: "interaction",
        triggerTarget: "INTERACT_SYNTH_COCKTAIL",
        optional: false,
        actions: [
          {
            id: "ACTION_SPAWN_WHISKEY_WOMAN",
            type: "spawn_npc",
            targetId: "ACTOR_WHISKEY_WOMAN",
            detail:
              "Seat her beside Grayson despite the surrounding empty stools.",
          },
          {
            id: "ACTION_PLAY_REAL_WHISKEY_ORDER",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_REAL_WHISKEY",
            detail:
              "Interrupt the bartender before the synthetic bottle is poured.",
          },
          {
            id: "ACTION_SHOW_NO_LENS_OBSERVATION",
            type: "show_hud",
            targetId: "HUD_WOMAN_NO_LENS",
            detail:
              "Show only once the woman’s eyes are readable in split light.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_REAL_WHISKEY",
        title: "Toast to hangovers",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_WOMAN_REAL_WHISKEY",
        optional: false,
        actions: [
          {
            id: "ACTION_REVEAL_REAL_WHISKEY",
            type: "update_interactable",
            targetId: "INTERACT_REAL_WHISKEY_BOTTLE",
            detail:
              "Bring out the dusty bottle and give the glass and liquid tactile weight.",
          },
          {
            id: "ACTION_PLAY_HANGOVER_TOAST",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_TO_HANGOVERS",
            detail: "Let Grayson commit to the first real drink in years.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_LIES_DIALOGUE",
        title: "Talk about lies",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_GRAYSON_TO_HANGOVERS",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_REFRESHING_LIE",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_REFRESHING_LIE",
            detail:
              "Turn the conversation from the reading toward Grayson’s concealed motive.",
          },
          {
            id: "ACTION_PLAY_ALL_LIES",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_ALL_LIES",
            detail: "Push from public performance into identity.",
          },
          {
            id: "ACTION_PLAY_IDENTITY_QUESTION",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_WHO_ARE_YOU",
            detail:
              "Offer the bounded expressive choice after the source question.",
          },
          {
            id: "ACTION_SHOW_BAR_CHOICE",
            type: "show_hud",
            targetId: "HUD_BAR_CHOICE_CONSEQUENCE",
            detail:
              "Only show when the non-canonical vulnerability option is selected.",
          },
        ],
        status: "needs_discussion",
      },
      {
        id: "BEAT_LEAVE_WITH_BOTTLE",
        title: "Follow her outside",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_WOMAN_WHO_ARE_YOU",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_LOSS_OF_CONTROL",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_LOSS_OF_CONTROL",
            detail:
              "Land the scene’s bodily and thematic turn before she stands.",
          },
          {
            id: "ACTION_GIVE_WHISKEY_BOTTLE",
            type: "update_interactable",
            targetId: "INTERACT_REAL_WHISKEY_BOTTLE",
            detail: "The woman takes the bottle for the walk.",
          },
          {
            id: "ACTION_PLAY_LETS_GO",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_LETS_GO",
            detail:
              "Have her move before Grayson has fully decided to follow.",
          },
          {
            id: "ACTION_UNLOCK_NIGHT_WALK",
            type: "unlock_exit",
            targetId: "CH01_S08_NIGHT_WALK",
            detail:
              "Resolve Bracelet payment, then transition to the street.",
          },
        ],
        status: "unreviewed",
      },
    ],
    notes:
      "The unnamed woman must remain unnamed in Chapter 1. The alternative identity response is an explicit proposal and should not be treated as canon until reviewed.",
  },
  {
    id: "CH01_S08_NIGHT_WALK",
    order: 8,
    title: "Fortunes",
    timeContext: "Night",
    status: "needs_author_review",
    presentationMode: "scrolling_hd2d",
    playerGoal:
      "Share a vice-driven interlude and receive an ambiguous promise.",
    sourceExcerpt:
      "We walk. She periodically takes a drink from the bottle and hands it to me. I light a cigarette and she snatches it from my mouth and places it on her lips. We were just two people wondering in the night passing vices back and forth.\n\nShe stops in front of a small restaurant named ‘Dragon Noodle.’\n\n“Here.” She comes out of the restaurant and hands me a fortune cookie.\n\n“Within one month you’ll gain back something you lost.”\n\n“No, you keep that… so, what did you lose exactly?”\n\n“My mind.”\n\n“What about you?”\n\n“It’s personal.” She says with a stern expression, the humor gone from her eyes. She puts the piece of paper in her pocket and continues to walk.",
    dialogue: [
      {
        id: "DIALOGUE_WOMAN_SOMEWHERE_TO_TALK",
        speaker: "Unnamed woman",
        text: "Somewhere we can talk. It’s a place I found.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_JUST_SAY_JAPAN",
        speaker: "Unnamed woman",
        text: "Just say Japan. I hate the fact nothing’s what it is anymore.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_FORTUNE",
        speaker: "Grayson",
        text: "Within one month you’ll gain back something you lost.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_LOST_MIND",
        speaker: "Grayson",
        text: "My mind.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_FORTUNE_PRIVATE",
        speaker: "Unnamed woman",
        text: "It’s personal.",
        sourceLocked: true,
        status: "unreviewed",
      },
    ],
    storyChanges: [],
    npcs: [
      {
        id: "ACTOR_WHISKEY_WOMAN",
        displayName: "Unnamed woman",
        role: "Companion leading Grayson toward a private place",
        presence: "present_at_start",
        behavior: "follow_player",
        entranceBeatId: "",
        exitBeatId: "",
        stagingNotes:
          "Keep the walk playful and coordinated until her private fortune abruptly closes her expression.",
        status: "unreviewed",
      },
    ],
    items: [
      {
        id: "ITEM_GRAYSON_FORTUNE",
        name: "Grayson’s fortune slip",
        kind: "document",
        initialState: "hidden",
        persistence: "chapter",
        interactionPrompt: "Read",
        outcome:
          "Preserve the promise that Grayson will regain something within one month.",
        status: "unreviewed",
      },
    ],
    interactables: [
      {
        id: "INTERACT_SHARED_WHISKEY_BOTTLE",
        name: "Shared whiskey bottle",
        kind: "prop",
        interactionPrompt: "Take a drink",
        outcome:
          "Continue the reciprocal bottle-and-cigarette rhythm during the walk.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_SHARED_CIGARETTE",
        name: "Shared cigarette",
        kind: "prop",
        interactionPrompt: "Pass cigarette",
        outcome:
          "Express temporary intimacy through a paired handoff animation.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_FORTUNE_COOKIE",
        name: "Fortune cookie",
        kind: "prop",
        interactionPrompt: "Open",
        outcome: "Reveal Grayson’s prediction and prompt the question of loss.",
        status: "unreviewed",
      },
    ],
    hudEvents: [
      {
        id: "HUD_FORTUNE_REVEAL",
        channel: "item_reveal",
        text: "Within one month you’ll gain back something you lost.",
        trigger: "The player opens Grayson’s fortune cookie.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        status: "unreviewed",
      },
    ],
    beats: [
      {
        id: "BEAT_SHARED_VICES",
        title: "Walk and trade vices",
        triggerType: "begin_play",
        triggerTarget: "",
        optional: false,
        actions: [
          {
            id: "ACTION_MOVE_WOMAN_ALONG_ROUTE",
            type: "move_npc",
            targetId: "ACTOR_WHISKEY_WOMAN",
            detail:
              "Keep her beside Grayson while the bottle and cigarette trade hands.",
          },
          {
            id: "ACTION_PASS_WHISKEY",
            type: "update_interactable",
            targetId: "INTERACT_SHARED_WHISKEY_BOTTLE",
            detail: "Alternate ownership without interrupting movement.",
          },
          {
            id: "ACTION_PASS_CIGARETTE",
            type: "update_interactable",
            targetId: "INTERACT_SHARED_CIGARETTE",
            detail:
              "Pair the handoff with softened city ambience and Grayson’s rare smile.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_FORTUNE_COOKIE",
        title: "Stop at Dragon Noodle",
        triggerType: "interaction",
        triggerTarget: "INTERACT_FORTUNE_COOKIE",
        optional: false,
        actions: [
          {
            id: "ACTION_GIVE_GRAYSON_FORTUNE",
            type: "give_item",
            targetId: "ITEM_GRAYSON_FORTUNE",
            detail:
              "Crack the cookie and keep the small paper legible as a retained item.",
          },
          {
            id: "ACTION_SHOW_FORTUNE",
            type: "show_hud",
            targetId: "HUD_FORTUNE_REVEAL",
            detail: "Present the source text exactly.",
          },
          {
            id: "ACTION_PLAY_GRAYSON_FORTUNE",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_FORTUNE",
            detail: "Have Grayson read the line aloud before joking about his mind.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_HIDDEN_FORTUNE",
        title: "Ask about her fortune",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_GRAYSON_FORTUNE",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_LOST_MIND",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_LOST_MIND",
            detail: "Let the joke briefly restore the playful tone.",
          },
          {
            id: "ACTION_PLAY_PRIVATE_FORTUNE",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_FORTUNE_PRIVATE",
            detail:
              "Remove the humor from her expression and keep her slip unreadable.",
          },
          {
            id: "ACTION_UNLOCK_CONSTRUCTION_TOWER",
            type: "unlock_exit",
            targetId: "CH01_S09_CONSTRUCTION_TOWER",
            detail:
              "Continue walking toward the construction-zone fence breach.",
          },
        ],
        status: "unreviewed",
      },
    ],
    notes:
      "The woman’s fortune remains unread and her name remains unknown. Avoid camera effects that make the intoxicated walk visually uncomfortable.",
  },
  {
    id: "CH01_S09_CONSTRUCTION_TOWER",
    order: 9,
    title: "Above the City",
    timeContext: "Night",
    status: "needs_author_review",
    presentationMode: "static_cinematic",
    playerGoal:
      "Reach a place where silence and isolation feel restorative rather than empty.",
    sourceExcerpt:
      "We return across the solar sidewalks and electric rails and she leads me to a construction zone. After searching along the dark chain link she finds a stretch of cut fencing and I follow.\n\nConcrete stairs continue ad infinitum. Every floor we rise above the buzzing electric of the city, its people, its burning bulbs which obfuscate the night that holds stars hidden above. Every floor is a closer to a peace I had forgotten existed.\n\nI lost her in the thick fog that now surrounds us. “Where are you?” I ask the quiet black night, I ask the fog.\n\n“Here,” is the fog’s response.\n\n“Where?”\n\n“Everywhere,” the voice reverberates around me.\n\n“It’s beautiful.”\n\n“It is and it’s always been here, waiting for you.”\n\n“It’s lonely here.”\n\n“And?”\n\n“It feels nice. Sometimes I simply want to escape.”\n\n“To feel singular, I’m not alone.”\n\n“I’m here.”\n\n“Everywhere.”\n\n“Exactly.” We lean against each other.",
    dialogue: [
      {
        id: "DIALOGUE_GRAYSON_WHERE_ARE_YOU",
        speaker: "Grayson",
        text: "Where are you?",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_HERE_EVERYWHERE",
        speaker: "Unnamed woman",
        text: "Here. Everywhere.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_BEAUTIFUL",
        speaker: "Grayson",
        text: "It’s beautiful.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_ALWAYS_HERE",
        speaker: "Unnamed woman",
        text: "It is and it’s always been here, waiting for you.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_GRAYSON_SINGULAR",
        speaker: "Grayson",
        text: "To feel singular, I’m not alone.",
        sourceLocked: true,
        status: "unreviewed",
      },
      {
        id: "DIALOGUE_WOMAN_IM_HERE",
        speaker: "Unnamed woman",
        text: "I’m here.",
        sourceLocked: true,
        status: "unreviewed",
      },
    ],
    storyChanges: [],
    npcs: [
      {
        id: "ACTOR_WHISKEY_WOMAN",
        displayName: "Unnamed woman",
        role: "Guide through the tower and Grayson’s temporary connection",
        presence: "present_at_start",
        behavior: "follow_path",
        entranceBeatId: "",
        exitBeatId: "",
        stagingNotes:
          "Lead confidently at first, disappear into fog for the audio-navigation beat, then rejoin at the rooftop edge.",
        status: "unreviewed",
      },
    ],
    items: [],
    interactables: [
      {
        id: "INTERACT_CUT_FENCE",
        name: "Cut chain-link fence",
        kind: "transition",
        interactionPrompt: "Slip through",
        outcome:
          "Leave the managed city route and enter the unfinished tower.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_CONCRETE_STAIRS",
        name: "Concrete stairwell",
        kind: "traversal",
        interactionPrompt: "Climb",
        outcome:
          "Ascend through repeated floors as city noise and artificial light fall away.",
        status: "unreviewed",
      },
      {
        id: "INTERACT_ROOFTOP_EDGE",
        name: "Rooftop edge",
        kind: "inspection",
        interactionPrompt: "Look out",
        outcome:
          "Reveal the orange city glow below, black sky above, and unseen ocean.",
        status: "unreviewed",
      },
    ],
    hudEvents: [
      {
        id: "HUD_CLIMB_ABOVE_CITY",
        channel: "objective",
        text: "Climb above the city noise.",
        trigger: "Grayson enters the unfinished tower.",
        dismissMode: "beat_advance",
        durationSeconds: 0,
        status: "unreviewed",
      },
      {
        id: "HUD_FORGOTTEN_SILENCE",
        channel: "internal_observation",
        text: "It’s a funny thing, to forget what silence feels like.",
        trigger: "The city sound finally drops away during the ascent.",
        dismissMode: "player_dismiss",
        durationSeconds: 0,
        status: "unreviewed",
      },
    ],
    beats: [
      {
        id: "BEAT_ENTER_CUT_FENCE",
        title: "Enter through the cut fence",
        triggerType: "interaction",
        triggerTarget: "INTERACT_CUT_FENCE",
        optional: false,
        actions: [
          {
            id: "ACTION_SHOW_CLIMB_OBJECTIVE",
            type: "show_hud",
            targetId: "HUD_CLIMB_ABOVE_CITY",
            detail:
              "Keep the objective quiet and remove it once the ascent is underway.",
          },
          {
            id: "ACTION_MOVE_WOMAN_INSIDE",
            type: "move_npc",
            targetId: "ACTOR_WHISKEY_WOMAN",
            detail:
              "Have her locate the breach and lead Grayson into darkness.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_ASCENT",
        title: "Climb the unfinished floors",
        triggerType: "interaction",
        triggerTarget: "INTERACT_CONCRETE_STAIRS",
        optional: false,
        actions: [
          {
            id: "ACTION_REDUCE_CITY_AUDIO",
            type: "play_audio",
            targetId: "AUDIO_CITY_VERTICAL_FADE",
            detail:
              "Reduce electrical buzz and street density floor by floor; retain wind and structure creaks.",
          },
          {
            id: "ACTION_REPEAT_TOWER_FLOORS",
            type: "camera",
            targetId: "VERTICAL_TOWER_ASCENT",
            detail:
              "Use tooth-like repeated floors without making the climb long or mechanically tedious.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_LOST_IN_FOG",
        title: "Follow her voice through fog",
        triggerType: "player_enters",
        triggerTarget: "Upper fog level",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_WHERE_ARE_YOU",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_WHERE_ARE_YOU",
            detail: "Let the question fall into a nearly black frame.",
          },
          {
            id: "ACTION_PLAY_HERE_EVERYWHERE",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_HERE_EVERYWHERE",
            detail:
              "Place the two answers as spatial voice cues that guide rather than mislead.",
          },
          {
            id: "ACTION_MOVE_WOMAN_THROUGH_FOG",
            type: "move_npc",
            targetId: "ACTOR_WHISKEY_WOMAN",
            detail:
              "Hide her sprite intermittently while keeping the route accessible.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_CITY_REVEAL",
        title: "Stand above the city",
        triggerType: "interaction",
        triggerTarget: "INTERACT_ROOFTOP_EDGE",
        optional: false,
        actions: [
          {
            id: "ACTION_REVEAL_CITY_BELOW",
            type: "camera",
            targetId: "ROOFTOP_CITY_REVEAL",
            detail:
              "Open to diffuse orange light below, blackness above, and fog erasing the horizon.",
          },
          {
            id: "ACTION_SHOW_FORGOTTEN_SILENCE",
            type: "show_hud",
            targetId: "HUD_FORGOTTEN_SILENCE",
            detail:
              "Let the observation appear only after the city sound has receded.",
          },
          {
            id: "ACTION_PLAY_BEAUTIFUL",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_BEAUTIFUL",
            detail: "Keep the line small against the wide view.",
          },
          {
            id: "ACTION_PLAY_ALWAYS_HERE",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_ALWAYS_HERE",
            detail: "Answer from within the fog before she comes close.",
          },
        ],
        status: "unreviewed",
      },
      {
        id: "BEAT_CHAPTER_END",
        title: "Singular, not alone",
        triggerType: "dialogue_complete",
        triggerTarget: "DIALOGUE_WOMAN_ALWAYS_HERE",
        optional: false,
        actions: [
          {
            id: "ACTION_PLAY_SINGULAR",
            type: "play_dialogue",
            targetId: "DIALOGUE_GRAYSON_SINGULAR",
            detail:
              "Preserve Grayson’s distinction between solitude and abandonment.",
          },
          {
            id: "ACTION_PLAY_IM_HERE",
            type: "play_dialogue",
            targetId: "DIALOGUE_WOMAN_IM_HERE",
            detail: "Bring her arm around him before the final hold.",
          },
          {
            id: "ACTION_SET_CHAPTER_COMPLETE",
            type: "set_flag",
            targetId: "FLAG_CH01_COMPLETE",
            detail:
              "Hold on both figures leaning together, then fade without adding a new line.",
          },
        ],
        status: "unreviewed",
      },
    ],
    notes:
      "Treat silence as the reward. Spatial voice cues must remain accessible, the fog must not obscure navigation, and the final composition should hold without extra music or exposition.",
  },
];
