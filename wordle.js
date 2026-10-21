// ============================================
// Chelsea Wordle: daily puzzle, same word for everyone.
// - Built-in word list (below) picks a word each day.
// - A word scheduled in Supabase for today (e.g. DERBY on derby day)
//   takes priority over the built-in one.
// - Guesses are checked against a real word list.
// ============================================
import { supabase } from './supabase-client.js';

// Five-letter football terms + Chelsea player names/nicknames.
// Add more any time — just keep them exactly 5 letters.
const WORDS = [
  // Football terms
  'GOALS', 'PITCH', 'BENCH', 'MATCH', 'DRAWS', 'DERBY', 'TITLE', 'FINAL',
  'STAGE', 'GROUP', 'ROUND', 'SQUAD', 'TEAMS', 'CARDS', 'FOULS', 'SAVES',
  'VENUE', 'BLUES', 'EUROS', 'CROSS', 'SHOOT', 'SHOTS', 'BLOCK', 'PRESS',
  'TOUCH', 'FLICK', 'WINGS', 'CLUBS', 'SCORE', 'KICKS', 'FIELD', 'GRASS',
  'POSTS', 'CROWD', 'STAND', 'BOOTS', 'SHIRT', 'SOCKS', 'BADGE', 'CREST',
  'COACH', 'TRAIN', 'FLAGS', 'EXTRA', 'TABLE', 'POINT', 'MEDAL', 'GLORY',
  'LOANS', 'DEBUT', 'YOUTH', 'PRIDE', 'HEART', 'POWER', 'SPEED', 'SKILL',
  'FLAIR', 'CLASS', 'STARS', 'SHARP', 'QUICK', 'LOYAL', 'CLEAN', 'SHEET',
  'WALLS', 'ANGLE', 'PUNCH', 'CATCH', 'GLOVE', 'SWEEP', 'BACKS', 'BREAK',
  'SPACE', 'SWING', 'SLIDE', 'DIVES', 'AWARD', 'SUPER', 'WOMEN', 'WORLD',
  'GAMES', 'SEMIS', 'CHEER', 'STRIP', 'UPSET', 'FLANK', 'SHAPE', 'ZONAL',
  'COVER', 'TEMPO', 'FIGHT', 'SIDES', 'RIVAL', 'THROW', 'ELITE', 'SOLID',
  'TOUGH', 'BRAVE', 'SMART', 'ALERT', 'FOCUS', 'SHINE', 'MAGIC', 'DREAM',
  // Clubs and rivals
  'BARCA', 'SPURS', 'VILLA', 'LIONS', 'KINGS',
  // Chelsea names (first names, surnames, nicknames)
  'WALSH', 'JAMES', 'KIRBY', 'ALUKO', 'INGLE', 'HAYES', 'SONIA', 'MAREN',
  'ANIEK', 'JONNA', 'NIAMH', 'KEIRA', 'AGGIE', 'SANDY', 'MAYRA', 'NAOMI',
  'GIRMA', 'ELLIE', 'MAIKA', 'WIEKE', 'MAGDA',
];

// The classic Wordle answer list (~2,300 common 5-letter words) — used only
// to validate that a submitted guess is a real word, not as the puzzle's
// source of answers. Lowercase, matching how it's checked against input.
const DICTIONARY = ["cigar","rebut","sissy","humph","awake","blush","focal","evade","naval","serve","heath","dwarf","model","karma","stink","grade","quiet","bench","abate","feign","major","death","fresh","crust","stool","colon","abase","marry","react","batty","pride","floss","helix","croak","staff","paper","unfed","whelp","trawl","outdo","adobe","crazy","sower","repay","digit","crate","cluck","spike","mimic","pound","maxim","linen","unmet","flesh","booby","forth","first","stand","belly","ivory","seedy","print","yearn","drain","bribe","stout","panel","crass","flume","offal","agree","error","swirl","argue","bleed","delta","flick","totem","wooer","front","shrub","parry","biome","lapel","start","greet","goner","golem","lusty","loopy","round","audit","lying","gamma","labor","islet","civic","forge","corny","moult","basic","salad","agate","spicy","spray","essay","fjord","spend","kebab","guild","aback","motor","alone","hatch","hyper","thumb","dowry","ought","belch","dutch","pilot","tweed","comet","jaunt","enema","steed","abyss","growl","fling","dozen","boozy","erode","world","gouge","click","briar","great","altar","pulpy","blurt","coast","duchy","groin","fixer","group","rogue","badly","smart","pithy","gaudy","chill","heron","vodka","finer","surer","radio","rouge","perch","retch","wrote","clock","tilde","store","prove","bring","solve","cheat","grime","exult","usher","epoch","triad","break","rhino","viral","conic","masse","sonic","vital","trace","using","peach","champ","baton","brake","pluck","craze","gripe","weary","picky","acute","ferry","aside","tapir","troll","unify","rebus","boost","truss","siege","tiger","banal","slump","crank","gorge","query","drink","favor","abbey","tangy","panic","solar","shire","proxy","point","robot","prick","wince","crimp","knoll","sugar","whack","mount","perky","could","wrung","light","those","moist","shard","pleat","aloft","skill","elder","frame","humor","pause","ulcer","ultra","robin","cynic","aroma","caulk","shake","dodge","swill","tacit","other","thorn","trove","bloke","vivid","spill","chant","choke","rupee","nasty","mourn","ahead","brine","cloth","hoard","sweet","month","lapse","watch","today","focus","smelt","tease","cater","movie","saute","allow","renew","their","slosh","purge","chest","depot","epoxy","nymph","found","shall","harry","stove","lowly","snout","trope","fewer","shawl","natal","comma","foray","scare","stair","black","squad","royal","chunk","mince","shame","cheek","ample","flair","foyer","cargo","oxide","plant","olive","inert","askew","heist","shown","zesty","hasty","trash","fella","larva","forgo","story","hairy","train","homer","badge","midst","canny","fetus","butch","farce","slung","tipsy","metal","yield","delve","being","scour","glass","gamer","scrap","money","hinge","album","vouch","asset","tiara","crept","bayou","atoll","manor","creak","showy","phase","froth","depth","gloom","flood","trait","girth","piety","payer","goose","float","donor","atone","primo","apron","blown","cacao","loser","input","gloat","awful","brink","smite","beady","rusty","retro","droll","gawky","hutch","pinto","gaily","egret","lilac","sever","field","fluff","hydro","flack","agape","voice","stead","stalk","berth","madam","night","bland","liver","wedge","augur","roomy","wacky","flock","angry","bobby","trite","aphid","tryst","midge","power","elope","cinch","motto","stomp","upset","bluff","cramp","quart","coyly","youth","rhyme","buggy","alien","smear","unfit","patty","cling","glean","label","hunky","khaki","poker","gruel","twice","twang","shrug","treat","unlit","waste","merit","woven","octal","needy","clown","widow","irony","ruder","gauze","chief","onset","prize","fungi","charm","gully","inter","whoop","taunt","leery","class","theme","lofty","tibia","booze","alpha","thyme","eclat","doubt","parer","chute","stick","trice","alike","sooth","recap","saint","liege","glory","grate","admit","brisk","soggy","usurp","scald","scorn","leave","twine","sting","bough","marsh","sloth","dandy","vigor","howdy","enjoy","valid","ionic","equal","unset","floor","catch","spade","stein","exist","quirk","denim","grove","spiel","mummy","fault","foggy","flout","carry","sneak","libel","waltz","aptly","piney","inept","aloud","photo","dream","stale","vomit","ombre","fanny","unite","snarl","baker","there","glyph","pooch","hippy","spell","folly","louse","gulch","vault","godly","threw","fleet","grave","inane","shock","crave","spite","valve","skimp","claim","rainy","musty","pique","daddy","quasi","arise","aging","valet","opium","avert","stuck","recut","mulch","genre","plume","rifle","count","incur","total","wrest","mocha","deter","study","lover","safer","rivet","funny","smoke","mound","undue","sedan","pagan","swine","guile","gusty","equip","tough","canoe","chaos","covet","human","udder","lunch","blast","stray","manga","melee","lefty","quick","paste","given","octet","risen","groan","leaky","grind","carve","loose","sadly","spilt","apple","slack","honey","final","sheen","eerie","minty","slick","derby","wharf","spelt","coach","erupt","singe","price","spawn","fairy","jiffy","filmy","stack","chose","sleep","ardor","nanny","niece","woozy","handy","grace","ditto","stank","cream","usual","diode","valor","angle","ninja","muddy","chase","reply","prone","spoil","heart","shade","diner","arson","onion","sleet","dowel","couch","palsy","bowel","smile","evoke","creek","lance","eagle","idiot","siren","built","embed","award","dross","annul","goody","frown","patio","laden","humid","elite","lymph","edify","might","reset","visit","gusto","purse","vapor","crock","write","sunny","loath","chaff","slide","queer","venom","stamp","sorry","still","acorn","aping","pushy","tamer","hater","mania","awoke","brawn","swift","exile","birch","lucky","freer","risky","ghost","plier","lunar","winch","snare","nurse","house","borax","nicer","lurch","exalt","about","savvy","toxin","tunic","pried","inlay","chump","lanky","cress","eater","elude","cycle","kitty","boule","moron","tenet","place","lobby","plush","vigil","index","blink","clung","qualm","croup","clink","juicy","stage","decay","nerve","flier","shaft","crook","clean","china","ridge","vowel","gnome","snuck","icing","spiny","rigor","snail","flown","rabid","prose","thank","poppy","budge","fiber","moldy","dowdy","kneel","track","caddy","quell","dumpy","paler","swore","rebar","scuba","splat","flyer","horny","mason","doing","ozone","amply","molar","ovary","beset","queue","cliff","magic","truce","sport","fritz","edict","twirl","verse","llama","eaten","range","whisk","hovel","rehab","macaw","sigma","spout","verve","sushi","dying","fetid","brain","buddy","thump","scion","candy","chord","basin","march","crowd","arbor","gayly","musky","stain","dally","bless","bravo","stung","title","ruler","kiosk","blond","ennui","layer","fluid","tatty","score","cutie","zebra","barge","matey","bluer","aider","shook","river","privy","betel","frisk","bongo","begun","azure","weave","genie","sound","glove","braid","scope","wryly","rover","assay","ocean","bloom","irate","later","woken","silky","wreck","dwelt","slate","smack","solid","amaze","hazel","wrist","jolly","globe","flint","rouse","civil","vista","relax","cover","alive","beech","jetty","bliss","vocal","often","dolly","eight","joker","since","event","ensue","shunt","diver","poser","worst","sweep","alley","creed","anime","leafy","bosom","dunce","stare","pudgy","waive","choir","stood","spoke","outgo","delay","bilge","ideal","clasp","seize","hotly","laugh","sieve","block","meant","grape","noose","hardy","shied","drawl","daisy","putty","strut","burnt","tulip","crick","idyll","vixen","furor","geeky","cough","naive","shoal","stork","bathe","aunty","check","prime","brass","outer","furry","razor","elect","evict","imply","demur","quota","haven","cavil","swear","crump","dough","gavel","wagon","salon","nudge","harem","pitch","sworn","pupil","excel","stony","cabin","unzip","queen","trout","polyp","earth","storm","until","taper","enter","child","adopt","minor","fatty","husky","brave","filet","slime","glint","tread","steal","regal","guest","every","murky","share","spore","hoist","buxom","inner","otter","dimly","level","sumac","donut","stilt","arena","sheet","scrub","fancy","slimy","pearl","silly","porch","dingo","sepia","amble","shady","bread","friar","reign","dairy","quill","cross","brood","tuber","shear","posit","blank","villa","shank","piggy","freak","which","among","fecal","shell","would","algae","large","rabbi","agony","amuse","bushy","copse","swoon","knife","pouch","ascot","plane","crown","urban","snide","relay","abide","viola","rajah","straw","dilly","crash","amass","third","trick","tutor","woody","blurb","grief","disco","where","sassy","beach","sauna","comic","clued","creep","caste","graze","snuff","frock","gonad","drunk","prong","lurid","steel","halve","buyer","vinyl","utile","smell","adage","worry","tasty","local","trade","finch","ashen","modal","gaunt","clove","enact","adorn","roast","speck","sheik","missy","grunt","snoop","party","touch","mafia","emcee","array","south","vapid","jelly","skulk","angst","tubal","lower","crest","sweat","cyber","adore","tardy","swami","notch","groom","roach","hitch","young","align","ready","frond","strap","puree","realm","venue","swarm","offer","seven","dryer","diary","dryly","drank","acrid","heady","theta","junto","pixie","quoth","bonus","shalt","penne","amend","datum","build","piano","shelf","lodge","suing","rearm","coral","ramen","worth","psalm","infer","overt","mayor","ovoid","glide","usage","poise","randy","chuck","prank","fishy","tooth","ether","drove","idler","swath","stint","while","begat","apply","slang","tarot","radar","credo","aware","canon","shift","timer","bylaw","serum","three","steak","iliac","shirk","blunt","puppy","penal","joist","bunny","shape","beget","wheel","adept","stunt","stole","topaz","chore","fluke","afoot","bloat","bully","dense","caper","sneer","boxer","jumbo","lunge","space","avail","short","slurp","loyal","flirt","pizza","conch","tempo","droop","plate","bible","plunk","afoul","savoy","steep","agile","stake","dwell","knave","beard","arose","motif","smash","broil","glare","shove","baggy","mammy","swamp","along","rugby","wager","quack","squat","snaky","debit","mange","skate","ninth","joust","tramp","spurn","medal","micro","rebel","flank","learn","nadir","maple","comfy","remit","gruff","ester","least","mogul","fetch","cause","oaken","aglow","meaty","gaffe","shyly","racer","prowl","thief","stern","poesy","rocky","tweet","waist","spire","grope","havoc","patsy","truly","forty","deity","uncle","swish","giver","preen","bevel","lemur","draft","slope","annoy","lingo","bleak","ditty","curly","cedar","dirge","grown","horde","drool","shuck","crypt","cumin","stock","gravy","locus","wider","breed","quite","chafe","cache","blimp","deign","fiend","logic","cheap","elide","rigid","false","renal","pence","rowdy","shoot","blaze","envoy","posse","brief","never","abort","mouse","mucky","sulky","fiery","media","trunk","yeast","clear","skunk","scalp","bitty","cider","koala","duvet","segue","creme","super","grill","after","owner","ember","reach","nobly","empty","speed","gipsy","recur","smock","dread","merge","burst","kappa","amity","shaky","hover","carol","snort","synod","faint","haunt","flour","chair","detox","shrew","tense","plied","quark","burly","novel","waxen","stoic","jerky","blitz","beefy","lyric","hussy","towel","quilt","below","bingo","wispy","brash","scone","toast","easel","saucy","value","spice","honor","route","sharp","bawdy","radii","skull","phony","issue","lager","swell","urine","gassy","trial","flora","upper","latch","wight","brick","retry","holly","decal","grass","shack","dogma","mover","defer","sober","optic","crier","vying","nomad","flute","hippo","shark","drier","obese","bugle","tawny","chalk","feast","ruddy","pedal","scarf","cruel","bleat","tidal","slush","semen","windy","dusty","sally","igloo","nerdy","jewel","shone","whale","hymen","abuse","fugue","elbow","crumb","pansy","welsh","syrup","terse","suave","gamut","swung","drake","freed","afire","shirt","grout","oddly","tithe","plaid","dummy","broom","blind","torch","enemy","again","tying","pesky","alter","gazer","noble","ethos","bride","extol","decor","hobby","beast","idiom","utter","these","sixth","alarm","erase","elegy","spunk","piper","scaly","scold","hefty","chick","sooty","canal","whiny","slash","quake","joint","swept","prude","heavy","wield","femme","lasso","maize","shale","screw","spree","smoky","whiff","scent","glade","spent","prism","stoke","riper","orbit","cocoa","guilt","humus","shush","table","smirk","wrong","noisy","alert","shiny","elate","resin","whole","hunch","pixel","polar","hotel","sword","cleat","mango","rumba","puffy","filly","billy","leash","clout","dance","ovate","facet","chili","paint","liner","curio","salty","audio","snake","fable","cloak","navel","spurt","pesto","balmy","flash","unwed","early","churn","weedy","stump","lease","witty","wimpy","spoof","saner","blend","salsa","thick","warty","manic","blare","squib","spoon","probe","crepe","knack","force","debut","order","haste","teeth","agent","widen","icily","slice","ingot","clash","juror","blood","abode","throw","unity","pivot","slept","troop","spare","sewer","parse","morph","cacti","tacky","spool","demon","moody","annex","begin","fuzzy","patch","water","lumpy","admin","omega","limit","tabby","macho","aisle","skiff","basis","plank","verge","botch","crawl","lousy","slain","cubic","raise","wrack","guide","foist","cameo","under","actor","revue","fraud","harpy","scoop","climb","refer","olden","clerk","debar","tally","ethic","cairn","tulle","ghoul","hilly","crude","apart","scale","older","plain","sperm","briny","abbot","rerun","quest","crisp","bound","befit","drawn","suite","itchy","cheer","bagel","guess","broad","axiom","chard","caput","leant","harsh","curse","proud","swing","opine","taste","lupus","gumbo","miner","green","chasm","lipid","topic","armor","brush","crane","mural","abled","habit","bossy","maker","dusky","dizzy","lithe","brook","jazzy","fifty","sense","giant","surly","legal","fatal","flunk","began","prune","small","slant","scoff","torus","ninny","covey","viper","taken","moral","vogue","owing","token","entry","booth","voter","chide","elfin","ebony","neigh","minim","melon","kneed","decoy","voila","ankle","arrow","mushy","tribe","cease","eager","birth","graph","odder","terra","weird","tried","clack","color","rough","weigh","uncut","ladle","strip","craft","minus","dicey","titan","lucid","vicar","dress","ditch","gypsy","pasta","taffy","flame","swoop","aloof","sight","broke","teary","chart","sixty","wordy","sheer","leper","nosey","bulge","savor","clamp","funky","foamy","toxic","brand","plumb","dingy","butte","drill","tripe","bicep","tenor","krill","worse","drama","hyena","think","ratio","cobra","basil","scrum","bused","phone","court","camel","proof","heard","angel","petal","pouty","throb","maybe","fetal","sprig","spine","shout","cadet","macro","dodgy","satyr","rarer","binge","trend","nutty","leapt","amiss","split","myrrh","width","sonar","tower","baron","fever","waver","spark","belie","sloop","expel","smote","baler","above","north","wafer","scant","frill","awash","snack","scowl","frail","drift","limbo","fence","motel","ounce","wreak","revel","talon","prior","knelt","cello","flake","debug","anode","crime","salve","scout","imbue","pinky","stave","vague","chock","fight","video","stone","teach","cleft","frost","prawn","booty","twist","apnea","stiff","plaza","ledge","tweak","board","grant","medic","bacon","cable","brawl","slunk","raspy","forum","drone","women","mucus","boast","toddy","coven","tumor","truer","wrath","stall","steam","axial","purer","daily","trail","niche","mealy","juice","nylon","plump","merry","flail","papal","wheat","berry","cower","erect","brute","leggy","snipe","sinew","skier","penny","jumpy","rally","umbra","scary","modem","gross","avian","greed","satin","tonic","parka","sniff","livid","stark","trump","giddy","reuse","taboo","avoid","quote","devil","liken","gloss","gayer","beret","noise","gland","dealt","sling","rumor","opera","thigh","tonga","flare","wound","white","bulky","etude","horse","circa","paddy","inbox","fizzy","grain","exert","surge","gleam","belle","salvo","crush","fruit","sappy","taker","tract","ovine","spiky","frank","reedy","filth","spasm","heave","mambo","right","clank","trust","lumen","borne","spook","sauce","amber","lathe","carat","corer","dirty","slyly","affix","alloy","taint","sheep","kinky","wooly","mauve","flung","yacht","fried","quail","brunt","grimy","curvy","cagey","rinse","deuce","state","grasp","milky","bison","graft","sandy","baste","flask","hedge","girly","swash","boney","coupe","endow","abhor","welch","blade","tight","geese","miser","mirth","cloud","cabal","leech","close","tenth","pecan","droit","grail","clone","guise","ralph","tango","biddy","smith","mower","payee","serif","drape","fifth","spank","glaze","allot","truck","kayak","virus","testy","tepee","fully","zonal","metro","curry","grand","banjo","axion","bezel","occur","chain","nasal","gooey","filer","brace","allay","pubic","raven","plead","gnash","flaky","munch","dully","eking","thing","slink","hurry","theft","shorn","pygmy","ranch","wring","lemon","shore","mamma","froze","newer","style","moose","antic","drown","vegan","chess","guppy","union","lever","lorry","image","cabby","druid","exact","truth","dopey","spear","cried","chime","crony","stunk","timid","batch","gauge","rotor","crack","curve","latte","witch","bunch","repel","anvil","soapy","meter","broth","madly","dried","scene","known","magma","roost","woman","thong","punch","pasty","downy","knead","whirl","rapid","clang","anger","drive","goofy","email","music","stuff","bleep","rider","mecca","folio","setup","verso","quash","fauna","gummy","happy","newly","fussy","relic","guava","ratty","fudge","femur","chirp","forte","alibi","whine","petty","golly","plait","fleck","felon","gourd","brown","thrum","ficus","stash","decry","wiser","junta","visor","daunt","scree","impel","await","press","whose","turbo","stoop","speak","mangy","eying","inlet","crone","pulse","mossy","staid","hence","pinch","teddy","sully","snore","ripen","snowy","attic","going","leach","mouth","hound","clump","tonal","bigot","peril","piece","blame","haute","spied","undid","intro","basal","shine","gecko","rodeo","guard","steer","loamy","scamp","scram","manly","hello","vaunt","organ","feral","knock","extra","condo","adapt","willy","polka","rayon","skirt","faith","torso","match","mercy","tepid","sleek","riser","twixt","peace","flush","catty","login","eject","roger","rival","untie","refit","aorta","adult","judge","rower","artsy","rural","shave"];

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const SITE_URL = 'https://panashe77.github.io/chelsea-women-site';
const SCHEDULE_TIMEOUT_MS = 3000;   // how long to wait for a scheduled word before using the built-in one
const REVEAL_STEP_MS = 280;         // gap between tiles flipping (keep in step with wordle.css)
const REVEAL_TOTAL_MS = REVEAL_STEP_MS * (WORD_LENGTH - 1) + 650;

// Category shown above the board. Any word not listed here counts as a football term.
const DEFAULT_HINT = 'Football term';
const HINTS = {};
const addHints = (hint, words) => words.forEach(w => { HINTS[w] = hint; });
addHints('Club, nickname or ground', ['BARCA', 'SPURS', 'VILLA', 'LIONS', 'KINGS']);
addHints('A Chelsea surname', ['WALSH', 'JAMES', 'GIRMA']);
addHints('A Chelsea great’s surname', ['KIRBY', 'ALUKO', 'INGLE', 'HAYES']);
addHints('A Chelsea first name or nickname', [
  'SONIA', 'MAREN', 'ANIEK', 'JONNA', 'NIAMH', 'KEIRA', 'AGGIE',
  'SANDY', 'MAYRA', 'NAOMI', 'ELLIE', 'MAIKA', 'WIEKE', 'MAGDA',
]);

// Every word in our WORDS list is a valid guess too, even if it's a
// surname/nickname not in the dictionary above (e.g. WALSH, AGGIE, NIAMH).
const VALID_GUESSES = new Set([
  ...DICTIONARY,
  ...WORDS.map(w => w.toLowerCase()),
]);

// Same puzzle for every visitor on a given calendar day (UTC)
const EPOCH = new Date('2026-01-01T00:00:00Z');
const daysSinceEpoch = Math.floor((Date.now() - EPOCH.getTime()) / 86400000);
const puzzleNumber = daysSinceEpoch + 1;
const todayKey = new Date().toISOString().slice(0, 10); // e.g. "2026-10-04"

// Stepping by a large prime scrambles the order, but still shows every word
// exactly once before any word repeats (works while the list has fewer
// than 7,919 words).
let TARGET = WORDS[(daysSinceEpoch * 7919) % WORDS.length];
let hint = HINTS[TARGET] ?? DEFAULT_HINT;
let isSpecial = false;

const boardEl = document.getElementById('wordle-board');
const keyboardEl = document.getElementById('wordle-keyboard');
const messageEl = document.getElementById('wordle-message');
const hintEl = document.getElementById('wordle-hint');
const endEl = document.getElementById('wordle-end');
const shareBtn = document.getElementById('wordle-share');
const shareStatusEl = document.getElementById('wordle-share-status');

const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','BACK'],
];

let guesses = [];          // submitted guesses
let currentGuess = '';
let gameOver = false;
let revealingRow = -1;     // row currently flipping, or -1
let shakeRow = false;      // current row is shaking after a rejected guess
let inputLocked = false;   // true while tiles are flipping
let errorShown = false;    // true while a "Not in word list" style message is up

// ---------- Today's word: a scheduled one from Supabase wins over the built-in one ----------
async function loadScheduledWord() {
  try {
    const request = supabase
      .from('wordle_words')
      .select('word, hint, special')
      .eq('play_date', todayKey)
      .maybeSingle();
    const timeout = new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), SCHEDULE_TIMEOUT_MS));
    const result = await Promise.race([request, timeout]);

    if (!result || result.timedOut || result.error || !result.data) return;

    const word = String(result.data.word || '').toUpperCase();
    if (!/^[A-Z]{5}$/.test(word)) return;

    TARGET = word;
    isSpecial = Boolean(result.data.special);
    hint = result.data.hint || (isSpecial ? '' : DEFAULT_HINT);
    VALID_GUESSES.add(word.toLowerCase());
  } catch {
    // Offline, or the table isn't set up yet: just use the built-in word
  }
}

function renderHint() {
  const text = isSpecial
    ? (hint ? `⭐ Matchday word: ${hint}` : '⭐ Matchday word')
    : `Today's category: ${hint}`;
  hintEl.textContent = text;
  hintEl.classList.toggle('is-special', isSpecial);
}

// ---------- Persistence: one play per day ----------
function loadState() {
  const saved = localStorage.getItem('chelsea-wordle');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return parsed.date === todayKey && parsed.target === TARGET ? parsed : null;
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem('chelsea-wordle', JSON.stringify({
    date: todayKey,
    target: TARGET,
    guesses,
    gameOver,
  }));
}

// ---------- Scoring: handles duplicate letters correctly ----------
function scoreGuess(guess) {
  const result = Array(WORD_LENGTH).fill('gray');
  const targetLetters = TARGET.split('');
  const guessLetters = guess.split('');

  // First pass: exact matches (green)
  guessLetters.forEach((letter, i) => {
    if (letter === targetLetters[i]) {
      result[i] = 'green';
      targetLetters[i] = null;
    }
  });

  // Tally leftover target letters (excluding already-matched positions)
  const freq = {};
  targetLetters.forEach(l => { if (l) freq[l] = (freq[l] || 0) + 1; });

  // Second pass: yellow if letter exists elsewhere, not already used up
  guessLetters.forEach((letter, i) => {
    if (result[i] === 'green') return;
    if (freq[letter] > 0) {
      result[i] = 'yellow';
      freq[letter]--;
    }
  });

  return result;
}

// ---------- Rendering ----------
function render() {
  const rows = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i] ?? (i === guesses.length ? currentGuess : '');
    const isSubmitted = i < guesses.length;
    const isRevealing = i === revealingRow;
    const scores = isSubmitted ? scoreGuess(guess) : [];

    const tiles = [];
    for (let j = 0; j < WORD_LENGTH; j++) {
      const letter = guess[j] || '';
      const stateClass = isSubmitted ? `tile-${scores[j]}` : (letter ? 'tile-filled' : '');
      const flipAttrs = isRevealing ? ` tile-flip" style="--col:${j}` : '';
      tiles.push(`<div class="wordle-tile ${stateClass}${flipAttrs}">${letter}</div>`);
    }
    const shake = shakeRow && i === guesses.length ? ' row-shake' : '';
    rows.push(`<div class="wordle-row${shake}">${tiles.join('')}</div>`);
  }
  boardEl.innerHTML = rows.join('');
  renderKeyboard();
}

function renderKeyboard() {
  // While a row is flipping, keep its letters off the keyboard until the reveal finishes
  const visibleGuesses = guesses.slice(0, revealingRow >= 0 ? revealingRow : guesses.length);

  const letterStates = {}; // letter -> best known state
  visibleGuesses.forEach(guess => {
    const scores = scoreGuess(guess);
    guess.split('').forEach((letter, i) => {
      const state = scores[i];
      const rank = { gray: 0, yellow: 1, green: 2 };
      if (!letterStates[letter] || rank[state] > rank[letterStates[letter]]) {
        letterStates[letter] = state;
      }
    });
  });

  keyboardEl.innerHTML = KEY_ROWS.map(row => `
    <div class="wordle-key-row">
      ${row.map(key => {
        const isSpecialKey = key === 'ENTER' || key === 'BACK';
        const stateClass = letterStates[key] ? `key-${letterStates[key]}` : '';
        const label = key === 'BACK' ? '⌫' : key;
        return `<button class="wordle-key ${isSpecialKey ? 'wordle-key-wide' : ''} ${stateClass}" data-key="${key}">${label}</button>`;
      }).join('')}
    </div>
  `).join('');
}

function showMessage(text) {
  messageEl.textContent = text;
}

// ---------- Input handling ----------
function handleKey(key) {
  if (gameOver || inputLocked) return;

  if (key === 'ENTER') {
    submitGuess();
    return;
  }

  if (errorShown) { showMessage(''); errorShown = false; }

  if (key === 'BACK') {
    currentGuess = currentGuess.slice(0, -1);
  } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key;
  }
  render();
}

function reject(message) {
  showMessage(message);
  errorShown = true;
  shakeRow = true;
  render();
  setTimeout(() => { shakeRow = false; render(); }, 500);
}

function submitGuess() {
  if (currentGuess.length !== WORD_LENGTH) {
    reject('Not enough letters');
    return;
  }

  if (!VALID_GUESSES.has(currentGuess.toLowerCase())) {
    reject('Not in word list');
    return;
  }

  guesses.push(currentGuess);
  const finished = currentGuess === TARGET || guesses.length === MAX_GUESSES;
  currentGuess = '';
  if (finished) gameOver = true;
  saveState();

  // Flip the new row's tiles one by one, then reveal the result
  revealingRow = guesses.length - 1;
  inputLocked = true;
  errorShown = false;
  showMessage('');
  render();

  setTimeout(() => {
    revealingRow = -1;
    inputLocked = false;
    render();
    if (finished) showEnd();
  }, REVEAL_TOTAL_MS);
}

// ---------- End of game ----------
function showEnd() {
  const won = guesses[guesses.length - 1] === TARGET;
  showMessage(won ? `You got it in ${guesses.length}! 🔵` : `Out of guesses. It was ${TARGET}.`);
  keyboardEl.hidden = true;
  endEl.hidden = false;
}

function buildShareText() {
  const squares = { green: '🟦', yellow: '🟨', gray: '⬜' };
  const grid = guesses.map(g => scoreGuess(g).map(s => squares[s]).join('')).join('\n');
  const won = guesses[guesses.length - 1] === TARGET;
  const score = won ? guesses.length : 'X';
  return `Chelsea Wordle #${puzzleNumber} ${score}/${MAX_GUESSES}\n\n${grid}\n\n${SITE_URL}/wordle.html`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: fall back to a temporary text box
    try {
      const box = document.createElement('textarea');
      box.value = text;
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand('copy');
      box.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

shareBtn.addEventListener('click', async () => {
  const text = buildShareText();

  // On phones, open the share sheet; on desktop, copy to the clipboard
  if (navigator.share && /Mobi|Android/i.test(navigator.userAgent || '')) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // they closed the sheet
    }
  }

  const copied = await copyToClipboard(text);
  shareStatusEl.textContent = copied ? 'Copied! Paste it anywhere to share.' : 'Could not copy automatically.';
  if (!copied) window.prompt('Copy your result:', text);
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;   // don't swallow shortcuts like Ctrl+R
  const key = e.key.toUpperCase();
  if (key === 'ENTER') handleKey('ENTER');
  else if (key === 'BACKSPACE') handleKey('BACK');
  else if (/^[A-Z]$/.test(key)) handleKey(key);
});

keyboardEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.wordle-key');
  if (btn) handleKey(btn.dataset.key);
});

// ---------- Start ----------
async function init() {
  showMessage('Loading today’s word…');
  await loadScheduledWord();
  showMessage('');
  renderHint();

  const saved = loadState();
  if (saved) {
    guesses = saved.guesses;
    gameOver = saved.gameOver;
  }

  render();
  if (gameOver) showEnd();
}

init();
