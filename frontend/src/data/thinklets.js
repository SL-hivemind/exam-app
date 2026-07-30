/**
 * Thinklets content: short reads, riddles and book picks.
 *
 * Kept as data rather than markup so the page is a renderer and adding an
 * article is a data edit. Several entries and their S3 artwork were recovered
 * from the original Home.jsx thinklet section (commit aef4226) — the images
 * are the organisation's own uploads and are still live.
 *
 * Each article carries `body` as an array of blocks so the reader can lay out
 * a lead paragraph, key points and a closing line without parsing prose. A
 * `minutes` figure is an honest estimate at ~200 words per minute; it exists
 * because "how long is this going to take" is the question a student actually
 * asks before opening something.
 */

export const TOPICS = [
  { id: 'all', label: 'All', hue: '#f68914' },
  { id: 'everyday', label: 'Everyday Why', hue: '#fbbf24' },
  { id: 'science', label: 'Science', hue: '#4ade80' },
  { id: 'tech', label: 'Technology', hue: '#60a5fa' },
  { id: 'world', label: 'History & World', hue: '#c084fc' },
];

export const ARTICLES = [
  {
    id: 'traffic-sides',
    topic: 'everyday',
    title: 'Why some countries drive on the left',
    blurb:
      'Roughly a third of the world keeps left, the rest keeps right. The reason is older than the car — and it involves swords.',
    minutes: 3,
    image:
      'https://sl-exam-images.s3.ap-south-2.amazonaws.com/images/img_2f64fcb9ca16b3def097.png',
    body: [
      {
        type: 'lead',
        text:
          'A traffic rule feels like something a government simply decided one morning. Which side of the road you drive on is not that. It is a habit that hardened over centuries, and the country you live in inherited it from something that happened long before engines existed.',
      },
      {
        type: 'heading',
        text: 'It started with the sword hand',
      },
      {
        type: 'para',
        text:
          'The usual explanation goes back to a world where travel was dangerous and most people were right-handed. Keeping to the left meant a stranger coming the other way passed on your right — the side your sword hand could reach. Mounting a horse is also easier from its left, which is more comfortable to do from the roadside than from the middle of the road. Left-hand travel was, for a long time, simply the sensible default.',
      },
      {
        type: 'heading',
        text: 'Big wagons pushed the other way',
      },
      {
        type: 'para',
        text:
          'The change came from freight. Teamsters hauling goods with several pairs of horses had no driver\'s seat; they rode the rear-left animal so their right arm was free for the whip. From there, the driver could best judge clearances with oncoming traffic by keeping to the right. Post-revolutionary France adopted keeping right, and Napoleon carried the practice into the territories he took.',
      },
      {
        type: 'heading',
        text: 'Then empires froze it in place',
      },
      {
        type: 'para',
        text:
          'Britain kept left and exported it across its empire, which is why India, Australia and much of southern and eastern Africa still keep left today. Japan was never a British colony, but British engineers built its first railways in the 1800s and the left-hand convention came with them.',
      },
      {
        type: 'points',
        items: [
          'About two-thirds of the world\'s people drive on the right; the remaining third keeps left.',
          'Left-hand traffic came to India, Australia and much of Africa through British rule.',
          'Japan keeps left largely because British engineers laid its first railways.',
          'Sweden switched sides overnight on 3 September 1967 — a day known as Dagen H.',
        ],
      },
      {
        type: 'heading',
        text: 'A country can change its mind',
      },
      {
        type: 'para',
        text:
          'Sweden drove on the left while every one of its neighbours drove on the right. Early on 3 September 1967 the entire country switched. Traffic stopped, vehicles moved carefully across to the other side, and the nation started again on the right. It was planned for years and, remarkably, the days that followed saw fewer accidents than usual — drivers were concentrating.',
      },
      {
        type: 'closing',
        text:
          'That is the real lesson. A traffic rule is not a personal opinion and it is not there to inconvenience you. It is an agreement that lets thousands of strangers predict each other at speed. The side of the road is arbitrary; the agreement is not. Roads are safe because everyone keeps the same promise — which is exactly why breaking it, even once, is so much more dangerous than it feels.',
      },
    ],
  },
  {
    id: 'vasuki',
    topic: 'world',
    title: 'Vasuki indicus: India\'s prehistoric serpent',
    blurb:
      'A snake as long as a bus once moved through the swamps of Kutch, 47 million years ago.',
    minutes: 5,
    image:
      'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Vasuki-Indicus.jpg',
    source: 'https://www.nature.com/articles/d44151-024-00048-0',
    body: [
      {
        type: 'lead',
        text:
          'Forty-seven million years ago the Indian subcontinent was a warm, swampy island drifting slowly north through an ancient sea. Through those forests moved a serpent estimated at between eleven and fifteen metres long — close to the length of a tour bus.',
      },
      {
        type: 'para',
        text:
          'Palaeontologists recovered twenty-seven remarkably preserved vertebrae from a lignite mine in the Kutch region of Gujarat, some as wide as eleven centimetres. Dr Sunil Bajpai and Dr Debajit Datta of IIT Roorkee reconstructed the animal from them, concluding it was a slow-moving ambush predator that killed by constriction, much like a modern python but on an extraordinary scale.',
      },
      {
        type: 'heading',
        text: 'The name carries two stories',
      },
      {
        type: 'para',
        text:
          'Vasuki is the king of the nagas in Hindu mythology — the serpent coiled around Shiva\'s neck, and the rope used to churn the ocean of milk in the Samudra Manthan. "Indicus" is plain scientific Latin for "of India", the same suffix found in Elephas maximus indicus, the Indian elephant. The name puts a myth and a coordinate in the same two words.',
      },
      {
        type: 'closing',
        text:
          'The find matters beyond its size: it places India at the centre of a serpent lineage that spread across Africa and Europe as the continent drifted and collided with Asia. Legend and geology, pointing at the same place.',
      },
    ],
  },
  {
    id: 'nobel-2025',
    topic: 'science',
    title: '2025 Medical Laureates',
    blurb:
      'The Nobel Prize in Physiology or Medicine went to the discovery of the immune system\'s own security guards.',
    minutes: 2,
    image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Noble.png',
    source: 'https://www.nobelprize.org/',
    body: [
      {
        type: 'lead',
        text:
          'The 2025 Nobel Prize in Physiology or Medicine was awarded to Mary E. Brunkow, Fred Ramsdell and Shimon Sakaguchi for their discoveries concerning peripheral immune tolerance.',
      },
      {
        type: 'para',
        text:
          'Your immune system has a hard problem to solve. It must attack anything foreign while never attacking you. The laureates identified regulatory T cells — the cells that hold the immune response back and stop it turning on the body it is meant to defend.',
      },
      {
        type: 'closing',
        text:
          'That single idea opened a field. Treatments built on it are now in clinical trials, aiming at autoimmune disease, more effective cancer therapy, and fewer complications after stem cell transplants.',
      },
    ],
  },
  {
    id: 'ai-codev',
    topic: 'tech',
    title: 'The AI co-developer',
    blurb:
      'Software assistants stopped suggesting lines of code and started taking whole tasks.',
    minutes: 2,
    image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/AiCo.png',
    body: [
      {
        type: 'lead',
        text:
          'For years an AI coding tool was a better autocomplete. It finished the line you were typing. The shift that has settled in recently is different in kind: these systems now take an assignment.',
      },
      {
        type: 'para',
        text:
          'Give one a task — build a login service, find the security flaws in this module — and it will plan, write, run the tests, fix what broke, and report what it did. The work still needs checking, and it is often wrong in interesting ways, but the unit of work is no longer a line.',
      },
      {
        type: 'closing',
        text:
          'The job of the engineer moves accordingly: less typing, more deciding what should exist, and more judging whether what came back is actually correct.',
      },
    ],
  },
  {
    id: 'sound',
    topic: 'science',
    title: 'The physics of sound',
    blurb:
      'Nothing actually travels from a drum to your ear except a pattern of squeezes in the air.',
    minutes: 3,
    image:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'Hit a drum and the skin pushes the air next to it. That air squeezes the air beside it, which squeezes the next, and a pattern of compressions races outward. No air makes the journey from the drum to your ear — only the pattern does.',
      },
      {
        type: 'para',
        text:
          'How fast that pattern moves depends on what it is moving through. Sound travels faster in water than in air, and faster still in steel, because tightly packed particles pass the squeeze along more quickly. In a vacuum there is nothing to squeeze, which is why space is silent.',
      },
      {
        type: 'points',
        items: [
          'Frequency — how often the squeezes arrive — is what you hear as pitch.',
          'Amplitude — how hard each squeeze is — is what you hear as loudness.',
          'The shape of the wave is what makes a violin and a flute playing the same note sound different.',
        ],
      },
      {
        type: 'closing',
        text:
          'Your eardrum is simply a membrane that those squeezes push on. Everything else — the bones, the cochlea, the nerve — is machinery for turning that push into something a brain can read.',
      },
    ],
  },
  {
    id: 'ai-learns',
    topic: 'tech',
    title: 'How AI learns',
    blurb: 'No one writes the rules. The system is shown examples and adjusts until it stops being wrong.',
    minutes: 3,
    image:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'Suppose you want a program that recognises a cat. Writing the rules by hand is hopeless — describe a cat precisely enough and you will exclude half of them. So instead you build a system that learns the rules from examples.',
      },
      {
        type: 'para',
        text:
          'A neural network starts out useless, guessing at random. You show it a picture, it guesses, and you tell it how wrong it was. That error is used to nudge millions of internal numbers a tiny amount in the direction that would have been less wrong. Repeat across millions of pictures and the nudges accumulate into something that works.',
      },
      {
        type: 'closing',
        text:
          'This is why such systems need so much data, and why they inherit whatever is in it. A model trained on lopsided examples learns lopsided rules — not out of malice, but because that is what it was shown.',
      },
    ],
  },
  {
    id: 'algorithms',
    topic: 'world',
    title: 'A short history of algorithms',
    blurb:
      'The word comes from a ninth-century mathematician\'s name, and the idea is far older than computers.',
    minutes: 3,
    image:
      'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'An algorithm is just a set of steps that finishes. A recipe qualifies. So does the method you were taught for long division — which is exactly where the idea comes from.',
      },
      {
        type: 'para',
        text:
          'Babylonian clay tablets carry step-by-step procedures for solving problems, written well over three thousand years ago. Euclid set down a method for finding the greatest common divisor of two numbers around 300 BCE, and it is still taught and still used.',
      },
      {
        type: 'para',
        text:
          'The word itself honours Muhammad ibn Musa al-Khwarizmi, a Persian scholar of the ninth century whose works on Hindu-Arabic numerals reached Europe in translation. His name became "algorism", then "algorithm". The title of another of his books gave us the word "algebra".',
      },
      {
        type: 'closing',
        text:
          'Computers did not invent algorithms. They simply became a very fast, very literal way to run them.',
      },
    ],
  },
  {
    id: 'golden-ratio',
    topic: 'science',
    title: 'The golden ratio in nature',
    blurb:
      'Sunflower seeds spiral in a specific pattern, and the reason is packing, not beauty.',
    minutes: 3,
    image:
      'https://images.unsplash.com/photo-1518176510344-77dbdfc2491b?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'Count the spirals in a sunflower head and you tend to land on numbers like 34, 55 or 89 — consecutive Fibonacci numbers. Pine cones and pineapples do something similar. It looks like decoration. It is actually engineering.',
      },
      {
        type: 'para',
        text:
          'A plant adding seeds one at a time needs each new seed to land where there is still room. If it turns by a simple fraction of a circle between seeds, the seeds line up in rows and waste space. Turning by an angle related to the golden ratio never repeats, so new seeds keep falling into the gaps. The spirals are what that looks like from above.',
      },
      {
        type: 'closing',
        text:
          'The pattern is not there because it is pleasing. It is there because it fits the most seeds into the same head — and the plants that packed better left more offspring.',
      },
    ],
  },
  {
    id: 'flight',
    topic: 'science',
    title: 'The mechanics of flight',
    blurb: 'Four forces, constantly arguing. An aircraft flies when the argument goes its way.',
    minutes: 3,
    image:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'Everything in the air is being pulled on by four forces at once: lift up, weight down, thrust forward, drag back. Level flight at constant speed simply means lift matches weight and thrust matches drag.',
      },
      {
        type: 'points',
        items: [
          'Lift — the wing turns oncoming air downward, and the air pushes the wing up in return.',
          'Weight — gravity, unchanging and unimpressed.',
          'Thrust — engines or propellers pushing the aircraft forward.',
          'Drag — the air resisting that motion, growing sharply with speed.',
        ],
      },
      {
        type: 'para',
        text:
          'The wing is the interesting part. Its shape and its tilt into the airflow send air downward as it passes; by Newton\'s third law, pushing that much air down produces an upward push on the wing. Tilt too far and the airflow breaks away from the surface, lift collapses, and the wing stalls.',
      },
      {
        type: 'closing',
        text:
          'So a heavy metal aircraft stays up for an unglamorous reason: it is throwing an enormous quantity of air downward, every second.',
      },
    ],
  },
  {
    id: 'colors',
    topic: 'science',
    title: 'The chemistry of colour',
    blurb: 'Objects have no colour of their own. They only decide which light to send back.',
    minutes: 3,
    image:
      'https://images.unsplash.com/photo-1502691876148-a84978e59af8?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'A leaf is not green. A leaf absorbs red and blue light and reflects the green — and the green is all that reaches you. Colour is what is left over.',
      },
      {
        type: 'para',
        text:
          'Which wavelengths get absorbed depends on the electrons in a molecule. Chlorophyll happens to absorb strongly at the red and blue ends, which is why plants look green. Change the molecule and you change the leftovers: the same iron atom sits at the centre of haemoglobin, which reflects red.',
      },
      {
        type: 'para',
        text:
          'The sky is a different mechanism. Air molecules scatter shorter wavelengths far more than longer ones, so blue light is bounced around the sky and reaches your eye from every direction. At sunset the light travels through much more air, the blue is scattered away entirely, and what survives the journey is red.',
      },
      {
        type: 'closing',
        text:
          'Absorb, reflect, scatter. Three verbs, and every colour you have ever seen.',
      },
    ],
  },
  {
    id: 'singapore',
    topic: 'world',
    title: 'Singapore: the city that is a country',
    blurb: 'One of very few places on earth where the city limits and the national border are the same line.',
    minutes: 2,
    image:
      'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&q=80&w=800',
    body: [
      {
        type: 'lead',
        text:
          'Most countries contain cities. A city-state is the whole country — government, borders, army and rubbish collection all covering the same small patch of ground. Singapore is the clearest modern example, and the only one in Asia.',
      },
      {
        type: 'para',
        text:
          'It became independent in 1965 with almost no natural resources, not even reliable fresh water. What it had was a position: one of the busiest shipping lanes in the world runs past it. Much of what followed came from deciding to be useful to that traffic.',
      },
      {
        type: 'closing',
        text:
          'Being small turns out to cut both ways. Policy can change quickly because there is no distance between the decision and the ground — and there is nowhere to expand when it goes wrong.',
      },
    ],
  },
  {
    id: 'catfish',
    topic: 'science',
    title: 'A new species in the Himalayan foothills',
    blurb: 'Exostoma senticosum — a catfish nobody had described until recently.',
    minutes: 2,
    image:
      'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?auto=format&fit=crop&q=80&w=800',
    source:
      'https://www.ndtv.com/science/new-catfish-species-discovered-in-southwest-chinas-himalayan-region-9812357',
    body: [
      {
        type: 'lead',
        text:
          'Scientists working in the Himalayan region of southwest China identified a catfish new to science, named Exostoma senticosum. It joins a genus adapted to fast, cold hill streams.',
      },
      {
        type: 'para',
        text:
          'Fish in these waters face a constant problem: current. Members of this group are flattened underneath and use their mouth and fins to hold position against rock while the water rushes past.',
      },
      {
        type: 'closing',
        text:
          'It is worth noticing how ordinary this is. New species are described continuously, most of them small and unglamorous. The map of life is nowhere near finished.',
      },
    ],
  },
];

/**
 * Riddles. The first is the one that ran on the original Home page — kept
 * deliberately, with its typos cleaned up.
 */
export const RIDDLES = [
  {
    id: 'postbox',
    level: 'Classic',
    question:
      'I am a seven letter word. Remove one letter from me and I remain the same. Remove two, three, four, five or six letters and I still remain the same. Remove every letter and I am still the same. What am I?',
    hint: 'Think about what is inside it, not the word itself.',
    answer: 'A postbox',
    why: 'Take the letters out of a postbox and it is still a postbox.',
  },
  {
    id: 'footsteps',
    level: 'Easy',
    question: 'What can you leave behind you and still take with you everywhere you go?',
    hint: 'You make more of them the further you walk.',
    answer: 'Footprints',
    why: 'You leave each one behind, yet you never run out of the ability to make the next.',
  },
  {
    id: 'candle',
    level: 'Easy',
    question: 'The taller I am, the shorter I live. What am I?',
    hint: 'You light it.',
    answer: 'A candle',
    why: 'A long candle has burned for less time; burning is exactly what shortens it.',
  },
  {
    id: 'echo',
    level: 'Medium',
    question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
    hint: 'Shout at a hillside.',
    answer: 'An echo',
    why: 'It repeats what it "hears" and needs air to travel — no mouth, ears or body required.',
  },
  {
    id: 'coffin',
    level: 'Medium',
    question:
      'The person who makes it does not need it. The person who buys it does not use it. The person who uses it cannot see it. What is it?',
    hint: 'It is the last thing you would want to need.',
    answer: 'A coffin',
    why: 'Made by a carpenter, bought by the family, used by someone who cannot see it.',
  },
  {
    id: 'rivers',
    level: 'Medium',
    question:
      'I have rivers with no water, forests with no trees, and cities with no buildings. What am I?',
    hint: 'You fold me up and put me away.',
    answer: 'A map',
    why: 'Everything on it is a drawing of the thing, never the thing itself.',
  },
  {
    id: 'silence',
    level: 'Hard',
    question: 'If you say my name, I am gone. What am I?',
    hint: 'A classroom is asked for it constantly.',
    answer: 'Silence',
    why: 'Saying the word is itself a sound, which ends the thing it names.',
  },
  {
    id: 'sisters',
    level: 'Hard',
    question:
      'Two sisters: one gives birth to the other, and she in turn gives birth to the first. Who are they?',
    hint: 'One arrives as the other leaves, every single time.',
    answer: 'Day and night',
    why: 'Each one produces the other, endlessly, with no beginning to the cycle.',
  },
];

/** Book picks, recovered from the original Home page section. */
export const BOOKS = [
  {
    id: 'wings-of-fire',
    title: 'Wings of Fire',
    author: 'A. P. J. Abdul Kalam',
    cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg',
    moral: 'Your background does not decide your ceiling.',
    summary:
      'Kalam\'s own account of the road from delivering newspapers in Rameswaram to leading India\'s rocket and missile programmes, and eventually to the presidency. Honest about failure, and specific about what it took to recover from it.',
  },
  {
    id: 'serpents-revenge',
    title: 'The Serpent\'s Revenge',
    author: 'Sudha Murty',
    cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/serpents_revenge.jpg',
    moral: 'Every action carries a consequence, however small it looked at the time.',
    summary:
      'The side stories of the Mahabharata — the ones the main narrative rushes past. Why Takshaka cursed King Parikshit, how Yama himself came to be cursed, and what a mongoose taught Yudhishthira about sacrifice.',
  },
  {
    id: 'biggest-coverup',
    title: 'India\'s Biggest Cover-up',
    author: 'Anuj Dhar',
    cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Indias_biggest_coverup.jpg',
    moral: 'An official answer is still an answer that can be checked.',
    summary:
      'An examination of the disappearance of Subhas Chandra Bose, working through declassified files and commission reports to question the accepted account of the 1945 crash. Read it for the method as much as the conclusion.',
  },
  {
    id: 'sapiens',
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    cover:
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80',
    moral: 'Most of what feels permanent was invented, and recently.',
    summary:
      'A sweep through the history of our species, arguing that shared fictions — money, nations, companies — are what let large numbers of strangers cooperate at all.',
  },
];
