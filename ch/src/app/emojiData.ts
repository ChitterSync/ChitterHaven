export type EmojiItem = {
  char: string;
  name: string;
  keywords: string[];
  category: 'smileys' | 'gestures' | 'hearts' | 'animals' | 'food' | 'activity' | 'objects' | 'symbols';
};

export const EMOJI_LIST: EmojiItem[] = [
  // Smileys
  { char: '😀', name: 'grinning', keywords: ['smile','happy','joy'], category: 'smileys' },
  { char: '😄', name: 'smile', keywords: ['smile','happy','joy'], category: 'smileys' },
  { char: '😁', name: 'beaming', keywords: ['smile','grin'], category: 'smileys' },
  { char: '😆', name: 'laughing', keywords: ['lol','haha'], category: 'smileys' },
  { char: '🤣', name: 'rofl', keywords: ['lol','rofl','funny'], category: 'smileys' },
  { char: '😉', name: 'wink', keywords: ['wink','playful'], category: 'smileys' },
  { char: '😊', name: 'blush', keywords: ['smile','shy','warm'], category: 'smileys' },
  { char: '🙂', name: 'slight_smile', keywords: ['smile'], category: 'smileys' },
  { char: '🙃', name: 'upside_down', keywords: ['sarcasm','goofy'], category: 'smileys' },
  { char: '😮', name: 'open_mouth', keywords: ['wow','surprise'], category: 'smileys' },
  { char: '😴', name: 'sleeping', keywords: ['zzz','sleep'], category: 'smileys' },
  { char: '😢', name: 'cry', keywords: ['sad','tear'], category: 'smileys' },
  { char: '😭', name: 'sob', keywords: ['cry','tears'], category: 'smileys' },
  { char: '😡', name: 'angry', keywords: ['angry','mad'], category: 'smileys' },
  { char: '😱', name: 'scream', keywords: ['shock','fear'], category: 'smileys' },
  { char: '🤯', name: 'exploding_head', keywords: ['mindblown','wow'], category: 'smileys' },
  // Gestures
  { char: '👍', name: 'thumbs_up', keywords: ['like','approve'], category: 'gestures' },
  { char: '👎', name: 'thumbs_down', keywords: ['dislike','downvote'], category: 'gestures' },
  { char: '👌', name: 'ok_hand', keywords: ['ok','perfect'], category: 'gestures' },
  { char: '🙏', name: 'pray', keywords: ['please','thanks'], category: 'gestures' },
  { char: '👏', name: 'clap', keywords: ['applause','bravo'], category: 'gestures' },
  { char: '🙌', name: 'raised_hands', keywords: ['hooray','party'], category: 'gestures' },
  { char: '👋', name: 'wave', keywords: ['hello','hi','bye'], category: 'gestures' },
  { char: '🤝', name: 'handshake', keywords: ['agree','deal'], category: 'gestures' },
  // Hearts
  { char: '❤️', name: 'red_heart', keywords: ['love','like','heart'], category: 'hearts' },
  { char: '🧡', name: 'orange_heart', keywords: ['love','heart'], category: 'hearts' },
  { char: '💛', name: 'yellow_heart', keywords: ['love','heart'], category: 'hearts' },
  { char: '💚', name: 'green_heart', keywords: ['love','heart'], category: 'hearts' },
  { char: '💙', name: 'blue_heart', keywords: ['love','heart'], category: 'hearts' },
  { char: '💜', name: 'purple_heart', keywords: ['love','heart'], category: 'hearts' },
  { char: '🖤', name: 'black_heart', keywords: ['love','heart'], category: 'hearts' },
  // Animals
  { char: '🐶', name: 'dog', keywords: ['animal','pet'], category: 'animals' },
  { char: '🐱', name: 'cat', keywords: ['animal','pet'], category: 'animals' },
  { char: '🦊', name: 'fox', keywords: ['animal'], category: 'animals' },
  { char: '🐻', name: 'bear', keywords: ['animal'], category: 'animals' },
  { char: '🐼', name: 'panda', keywords: ['animal'], category: 'animals' },
  { char: '🦁', name: 'lion', keywords: ['animal'], category: 'animals' },
  { char: '🐸', name: 'frog', keywords: ['animal'], category: 'animals' },
  { char: '🐵', name: 'monkey', keywords: ['animal'], category: 'animals' },
  { char: '🦄', name: 'unicorn', keywords: ['animal','myth'], category: 'animals' },
  // Food
  { char: '🍕', name: 'pizza', keywords: ['food','slice'], category: 'food' },
  { char: '🍔', name: 'burger', keywords: ['food','cheeseburger'], category: 'food' },
  { char: '🍟', name: 'fries', keywords: ['food'], category: 'food' },
  { char: '🌮', name: 'taco', keywords: ['food'], category: 'food' },
  { char: '🍣', name: 'sushi', keywords: ['food'], category: 'food' },
  { char: '🍰', name: 'cake', keywords: ['dessert','birthday'], category: 'food' },
  { char: '🍪', name: 'cookie', keywords: ['dessert'], category: 'food' },
  { char: '🍫', name: 'chocolate', keywords: ['dessert'], category: 'food' },
  // Activity
  { char: '⚽', name: 'soccer', keywords: ['football','sports'], category: 'activity' },
  { char: '🏀', name: 'basketball', keywords: ['sports'], category: 'activity' },
  { char: '🎮', name: 'video_game', keywords: ['game','play'], category: 'activity' },
  { char: '🎧', name: 'headphones', keywords: ['music','listen'], category: 'activity' },
  { char: '💡', name: 'idea', keywords: ['light','think'], category: 'activity' },
  // Objects
  { char: '💻', name: 'laptop', keywords: ['computer','work'], category: 'objects' },
  { char: '🖱️', name: 'mouse', keywords: ['computer'], category: 'objects' },
  { char: '⌨️', name: 'keyboard', keywords: ['computer','typing'], category: 'objects' },
  { char: '📱', name: 'phone', keywords: ['mobile','cell'], category: 'objects' },
  { char: '🖊️', name: 'pen', keywords: ['write'], category: 'objects' },
  // Symbols
  { char: '✅', name: 'check', keywords: ['ok','done'], category: 'symbols' },
  { char: '❌', name: 'cross', keywords: ['x','no'], category: 'symbols' },
  { char: '⚠️', name: 'warning', keywords: ['alert'], category: 'symbols' },
  { char: '⭐', name: 'star', keywords: ['favorite'], category: 'symbols' },
  { char: '✨', name: 'sparkles', keywords: ['shine','magic'], category: 'symbols' },
];

export const CATEGORIES: { key: EmojiItem['category']; label: string }[] = [
  { key: 'smileys', label: 'Smileys' },
  { key: 'gestures', label: 'Gestures' },
  { key: 'hearts', label: 'Hearts' },
  { key: 'animals', label: 'Animals' },
  { key: 'food', label: 'Food' },
  { key: 'activity', label: 'Activity' },
  { key: 'objects', label: 'Objects' },
  { key: 'symbols', label: 'Symbols' },
];

export function filterEmojis(query: string, category?: EmojiItem['category']) {
  const q = query.trim().toLowerCase();
  let list = EMOJI_LIST;
  if (category) list = list.filter(e => e.category === category);
  if (!q) return list;
  return list.filter(e => e.name.includes(q) || e.keywords.some(k => k.includes(q)));
}

