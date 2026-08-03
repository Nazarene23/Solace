const embedBuilder = require(
  '../embeds/embedBuilder',
);

const affirmationService = require(
  './affirmationService',
);

const tipService = require(
  './tipService',
);

const reflectionService = require(
  './reflectionService',
);

const DAILY_THEMES = {
  Monday: {
    title: '🌱 Mindful Monday',
    introductions: [
      'Begin the week with a little more intention.',
      'Take a moment to notice what deserves your attention today.',
      'A steady start matters more than a perfect one.',
    ],
  },

  Tuesday: {
    title: '🌤️ Thoughtful Tuesday',
    introductions: [
      'Give yourself a little space to reflect today.',
      'A thoughtful pause can make the rest of the day feel lighter.',
      'Notice what your mind and body may be asking for.',
    ],
  },

  Wednesday: {
    title: '🌿 Wellness Wednesday',
    introductions: [
      'You have made it to the middle of the week. Take a breath.',
      'Let today include at least one small act of care.',
      'A simple reset can help you move forward with more clarity.',
    ],
  },

  Thursday: {
    title: '💙 Thankful Thursday',
    introductions: [
      'Take a moment to notice something good, even if it feels small.',
      'Gratitude does not erase difficulty, but it can create a little space around it.',
      'Pause and recognize something you appreciate today.',
    ],
  },

  Friday: {
    title: '✨ Fresh Friday',
    introductions: [
      'Let today be a chance to release some of the week’s pressure.',
      'You do not have to carry everything into the weekend.',
      'Make space for a small reset before the week ends.',
    ],
  },

  Saturday: {
    title: '🌸 Self-Care Saturday',
    introductions: [
      'Today is a good day to make room for rest and care.',
      'Give yourself permission to slow down where you can.',
      'Choose one small thing that helps you feel more grounded.',
    ],
  },

  Sunday: {
    title: '🌙 Slow Sunday',
    introductions: [
      'Let today move at a gentler pace.',
      'You do not need to rush through every quiet moment.',
      'Take some time to rest, reflect, and prepare without pressure.',
    ],
  },
};

function pickRandom(items) {
  return items[
    Math.floor(Math.random() * items.length)
  ];
}

function getLocalWeekday(timezone) {
  try {
    return new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: timezone,
        weekday: 'long',
      },
    ).format(new Date());
  } catch (error) {
    console.error(
      `Invalid timezone used for daily theme: ${timezone}`,
      error,
    );

    return 'Monday';
  }
}

function createDailyPost(
  settings,
  botUser = null,
  options = {},
) {
  if (!settings?.features) {
    throw new Error(
      'Daily-post features are missing.',
    );
  }

  if (!settings.guildId) {
    throw new Error(
      'The guild ID is missing from the settings.',
    );
  }

  const trackHistory =
    options.trackHistory !== false;

  const sections = [];

  if (settings.features.affirmation) {
    const affirmation =
      affirmationService.getNextAffirmation(
        settings.guildId,
        trackHistory,
      );

    sections.push(
      [
        '**🌱 Affirmation**',
        '',
        `> ${affirmation.text}`,
      ].join('\n'),
    );
  }

  if (settings.features.tip) {
    const tip =
      tipService.getNextTip(
        settings.guildId,
        trackHistory,
      );

    sections.push(
      [
        '**🌿 Wellness Tip**',
        '',
        tip.text,
      ].join('\n'),
    );
  }

  if (settings.features.reflection) {
    const reflection =
      reflectionService.getNextReflection(
        settings.guildId,
        trackHistory,
      );

    sections.push(
      [
        '**💭 Reflection Prompt**',
        '',
        reflection.text,
      ].join('\n'),
    );
  }

  if (sections.length === 0) {
    throw new Error(
      'No daily wellness content is enabled.',
    );
  }

  const weekday = getLocalWeekday(
    settings.timezone,
  );

  const theme =
    DAILY_THEMES[weekday] ??
    DAILY_THEMES.Monday;

  const description = [
    pickRandom(theme.introductions),
    '',
    sections.join('\n\n'),
    '',
    '*Move through today at a pace that respects your wellbeing.*',
  ].join('\n');

  return embedBuilder.create(
    theme.title,
    description,
    botUser,
  );
}

module.exports = {
  createDailyPost,
};