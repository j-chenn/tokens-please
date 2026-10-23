// All the tweakable content lives here: packages, game difficulty, trivia and dance prompts.

const CONFIG = {
  packages: [
    { tokens: 67,   level: 1, blurb: 'a quick doodle' },
    { tokens: 420,  level: 2, blurb: 'a respectable sketch' },
    { tokens: 1337, level: 3, blurb: 'an elite masterpiece' },
  ],
  // gap and speed are fractions of the game's height (bigger gap = easier)
  flappy: {
    1: { target: 3,  gap: 0.30, speed: 0.26 },
    2: { target: 10, gap: 0.27, speed: 0.28 },
    3: { target: 30, gap: 0.23, speed: 0.31 },
  },
  holdMs: 3000, // how long the robot holds to evaluate a dance
};

// Each question: q, the correct answer a, and three wrong answers.
// Level 1 needs 1/3 correct, level 2 needs 2/3, level 3 needs 3/3.
const TRIVIA = {
  1: [
    { q: 'How many legs does a spider have?', a: '8', wrong: ['6', '10', "depends on the spider's mood"] },
    { q: 'What is a jack-o\'-lantern usually carved from?', a: 'a pumpkin', wrong: ['a watermelon', 'a potato', 'a very patient eggplant'] },
    { q: '7 × 8 = ?', a: '56', wrong: ['54', '58', '64'] },
    { q: "What is a robot's favourite snack?", a: 'microchips', wrong: ['potato chips', 'cookies (the browser kind)', 'loose screws'] },
    { q: 'What is H₂O?', a: 'water', wrong: ['hydrogen peroxide', 'helium', 'hot 2 oatmeal'] },
    { q: 'Which planet is known as the Red Planet?', a: 'Mars', wrong: ['Venus', 'Jupiter', 'Pluto (spiritually)'] },
    { q: 'How many sides does a hexagon have?', a: '6', wrong: ['5', '7', '8'] },
    { q: 'What does a vampire famously avoid?', a: 'garlic', wrong: ['ketchup', 'wi-fi', 'tuesdays'] },
    { q: 'What does CPU stand for?', a: 'Central Processing Unit', wrong: ['Computer Power Unit', 'Central Pumpkin Unit', 'Core Program Utility'] },
    { q: 'What does 1337 mean in internet speak?', a: 'elite', wrong: ['lettuce', 'late', 'a really big number'] },
    { q: 'What sound does a ghost traditionally make?', a: 'boo', wrong: ['moo', 'yeehaw', 'error 404'] },
    { q: '2 to the power of 10 = ?', a: '1024', wrong: ['1000', '512', '2048'] },
  ],
  2: [
    { q: 'What is the derivative of x²?', a: '2x', wrong: ['x', 'x³/3', '2'] },
    { q: '17 × 13 = ?', a: '221', wrong: ['211', '231', '223'] },
    { q: "Ohm's law: V = ?", a: 'I × R', wrong: ['I / R', 'R / I', 'I² × R'] },
    { q: 'What is the chemical symbol for gold?', a: 'Au', wrong: ['Ag', 'Go', 'Gd'] },
    { q: 'Who wrote Frankenstein?', a: 'Mary Shelley', wrong: ['Bram Stoker', 'Edgar Allan Poe', 'Percy Shelley'] },
    { q: 'What is 255 in hexadecimal?', a: 'FF', wrong: ['FE', '100', 'EF'] },
    { q: 'Halloween traces back to which Celtic festival?', a: 'Samhain', wrong: ['Beltane', 'Imbolc', 'Lughnasadh'] },
    { q: 'Sum of the interior angles of a pentagon?', a: '540°', wrong: ['360°', '720°', '480°'] },
    { q: 'What does HTTP 404 mean?', a: 'Not Found', wrong: ['Forbidden', 'Server Error', 'Too Spooky'] },
    { q: 'log₂(64) = ?', a: '6', wrong: ['8', '32', '4'] },
    { q: 'Which of these is a real unit of length?', a: 'the smoot', wrong: ['the blorp', 'the kerfuffle', 'the glimbo'] },
    { q: 'How many seconds are in a day?', a: '86,400', wrong: ['36,000', '84,600', '100,000'] },
  ],
  3: [
    { q: '∫ 1/x dx = ?', a: 'ln|x| + C', wrong: ['−1/x² + C', 'x⁰ + C', 'eˣ + C'] },
    { q: 'e^(iπ) + 1 = ?', a: '0', wrong: ['1', '−1', 'i'] },
    { q: 'Lower bound for comparison-based sorting?', a: 'Ω(n log n)', wrong: ['Ω(n)', 'Ω(n²)', 'Ω(log n)'] },
    { q: 'What is HTTP status 418?', a: "I'm a teapot", wrong: ['Too Many Requests', 'Payload Too Large', 'Enhance Your Calm'] },
    { q: 'In JavaScript, 0.1 + 0.2 = ?', a: '0.30000000000000004', wrong: ['0.3', '0.30000000000000003', '0.29999999999999999'] },
    { q: 'Laplace transform of 1 (for t ≥ 0)?', a: '1/s', wrong: ['s', '1', 'e⁻ˢ'] },
    { q: 'Determinant of [[2, 3], [1, 4]]?', a: '5', wrong: ['11', '8', '−5'] },
    { q: 'The 10th Fibonacci number (F₁ = F₂ = 1)?', a: '55', wrong: ['34', '89', '144'] },
    { q: 'Resonant frequency of an LC circuit?', a: '1 / (2π√(LC))', wrong: ['2π√(LC)', '√(L/C)', '1 / (LC)'] },
    { q: 'Which metal has the highest melting point?', a: 'tungsten', wrong: ['titanium', 'osmium', 'iron'] },
    { q: 'What year was Night of the Living Dead released?', a: '1968', wrong: ['1963', '1972', '1978'] },
    { q: 'Dracula (1897) is written as…', a: 'letters, diaries & clippings', wrong: ['an epic poem', 'a stage play', 'second-person narration'] },
    { q: '0x1337 in decimal = ?', a: '4919', wrong: ['1337', '4917', '5119'] },
    { q: 'Σ (1/2)ⁿ for n = 1 to ∞ = ?', a: '1', wrong: ['2', '½', '∞'] },
    { q: 'How many edges does a 4D hypercube (tesseract) have?', a: '32', wrong: ['24', '16', '64'] },
  ],
};

const TRIVIA_PASS = [
  'big brain energy detected.',
  'the robot is impressed. beep.',
  'payment accepted in brain cells.',
];

const DANCE = {
  1: [
    'a sleepy cat waking up',
    'a tree in a strong wind',
    'popcorn popping',
    'a ghost floating down a hallway',
    'melting ice cream',
    'a chicken who just laid an egg',
    'spaghetti being cooked',
    'a bat hanging upside down',
  ],
  2: [
    'a wi-fi signal slowly losing bars',
    'a printer jamming',
    'a pumpkin being carved (from the pumpkin\'s point of view)',
    'a jellyfish at a rave',
    'a roomba stuck in a corner',
    'a candle in its last minute',
    'a baby bat learning to fly',
    'a skeleton trying to do yoga',
  ],
  3: [
    'the five stages of grief, as a dropped ice cream cone',
    'a merge conflict resolving itself',
    'the heat death of the universe',
    'a roomba falling in love with a vacuum',
    'a stack overflow',
    'a mitochondria realizing it is the powerhouse of the cell',
    'quantum superposition (be two things at once)',
    'the entire plot of Frankenstein in 30 seconds',
    'a vampire on a monday morning',
    'a neural network during training',
  ],
};

const DANCE_REJECTIONS = [
  'REJECTED. the robot felt nothing.',
  'REJECTED. more emotion. more limbs.',
  'REJECTED. the robot has seen better from a toaster.',
  'REJECTED. try again, but believe in yourself.',
];

// Dance loop, converted from robot_beep_boop.mid. Each note: [start beat, midi pitch, length in beats].
const DANCE_SONG = {
  bpm: 180,
  beats: 64,
  notes: [
    [0, 79, 1], [0, 84, 1], [1, 86, 1], [2, 84, 1], [2, 88, 1], [3, 84, 1], [4, 76, 2], [4, 79, 2], [6, 84, 2],
    [8, 74, 1], [8, 77, 1], [9, 79, 1], [10, 77, 1], [10, 81, 1], [11, 84, 1], [12, 74, 2], [12, 83, 2], [14, 86, 2],
    [16, 79, 1], [16, 84, 1], [17, 86, 1], [18, 79, 1], [18, 88, 1], [19, 84, 1], [20, 74, 2], [20, 81, 2], [22, 79, 2],
    [24, 71, 1], [24, 77, 1], [25, 76, 1], [26, 69, 1], [26, 74, 1], [27, 72, 1], [28, 71, 2], [28, 74, 2], [30, 79, 2],
    [32, 79, 1], [32, 88, 1], [33, 86, 1], [34, 76, 1], [34, 84, 1], [35, 84, 1], [36, 72, 2], [36, 81, 2], [38, 84, 2],
    [40, 81, 1], [40, 89, 1], [41, 88, 1], [42, 77, 1], [42, 86, 1], [43, 84, 1], [44, 79, 2], [44, 83, 2], [46, 79, 2],
    [48, 84, 1], [48, 88, 1], [49, 86, 1], [50, 79, 1], [50, 84, 1], [51, 79, 1], [52, 77, 2], [52, 81, 2], [54, 84, 2],
    [56, 74, 1], [56, 86, 1], [57, 84, 1], [58, 79, 1], [58, 83, 1], [59, 86, 1], [60, 76, 2], [60, 84, 2], [62, 72, 2], [62, 84, 2],
  ],
};
