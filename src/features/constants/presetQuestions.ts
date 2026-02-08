export interface PresetQuestion {
  readonly id: string
  readonly text: string
}

export const PRESET_QUESTIONS: readonly PresetQuestion[] = [
  { id: 'recommend-today', text: '今日のおすすめの香水は？' },
  { id: 'business', text: 'ビジネスにおすすめの香水はある？' },
  { id: 'beginner', text: '初心者におすすめの香水を教えて' },
  { id: 'seasonal', text: '春にぴったりの香水は？' },
  { id: 'gift', text: 'プレゼントにおすすめの香水はある？' },
] as const
