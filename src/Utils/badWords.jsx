export const DEFAULT_BAD_WORDS = [
  'ass','asshole','bastard','bitch','bullshit','cock','crap','cunt','damn',
  'dick','douche','dumbass','fag','faggot','fuck','fucking','fucked','fucker',
  'hell','jackass','motherfucker','piss','prick','pussy','shit','shithead',
  'slut','twat','whore','wtf','stfu','dipshit','clusterfuck','douchebag'
]

export function maskWords(text, customWords = []) {
  const all = [
    ...DEFAULT_BAD_WORDS,
    ...customWords.map(w => w.toLowerCase().trim())
  ].filter(Boolean)

  if (!all.length) return text

  const pattern = new RegExp(
    `\\b(${all.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  )
  return text.replace(pattern, m => m[0] + '*'.repeat(m.length - 1))
}