import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { SYSTEM_PROMPT } from '@/features/constants/systemPromptConstants'
import { AIService, Language } from '../constants/settings'
import { googleSearchGroundingModels } from '../constants/aiModels'
import { migrateOpenAIModelName } from '@/utils/modelMigration'

export type googleSearchGroundingModelKey =
  (typeof googleSearchGroundingModels)[number]

interface APIKeys {
  openaiKey: string
  anthropicKey: string
  googleKey: string
  azureKey: string
  xaiKey: string
  groqKey: string
  cohereKey: string
  mistralaiKey: string
  perplexityKey: string
  fireworksKey: string
  deepseekKey: string
  openrouterKey: string
  lmstudioKey: string
  ollamaKey: string
  azureEndpoint: string
  customApiUrl: string
  customApiHeaders: string
  customApiBody: string
  customApiStream: boolean
  includeSystemMessagesInCustomApi: boolean
  customApiIncludeMimeType: boolean
}

interface ModelProvider {
  selectAIService: AIService
  selectAIModel: string
  localLlmUrl: string
}

interface Character {
  characterName: string
  showAssistantText: boolean
  showCharacterName: boolean
  selectedVrmPath: string
  fixedCharacterPosition: boolean
  characterPosition: {
    x: number
    y: number
    z: number
    scale: number
  }
  characterRotation: {
    x: number
    y: number
    z: number
  }
  lightingIntensity: number
}

// Preset question type
export interface PresetQuestion {
  id: string
  text: string
  order: number
}

interface General {
  selectLanguage: Language
  changeEnglishToJapanese: boolean
  includeTimestampInUserMessage: boolean
  showControlPanel: boolean
  showQuickMenu: boolean
  externalLinkageMode: boolean
  messageReceiverEnabled: boolean
  clientId: string
  useSearchGrounding: boolean
  dynamicRetrievalThreshold: number
  maxPastMessages: number
  useVideoAsBackground: boolean
  temperature: number
  maxTokens: number
  presetQuestions: PresetQuestion[]
  showPresetQuestions: boolean
  chatLogWidth: number
  imageDisplayPosition: 'input' | 'side' | 'icon'
  multiModalMode: 'ai-decide' | 'always' | 'never'
  multiModalAiDecisionPrompt: string
  enableMultiModal: boolean
  colorTheme: 'scensei'
  customModel: boolean
}

export type SettingsState = APIKeys & ModelProvider & Character & General

// Function to get initial values from environment variables
const getInitialValuesFromEnv = (): SettingsState => ({
  // API Keys
  openaiKey:
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    process.env.NEXT_PUBLIC_OPENAI_KEY ||
    '',
  anthropicKey: '',
  googleKey: '',
  azureKey:
    process.env.NEXT_PUBLIC_AZURE_API_KEY ||
    process.env.NEXT_PUBLIC_AZURE_KEY ||
    '',
  xaiKey: '',
  groqKey: '',
  cohereKey: '',
  mistralaiKey: '',
  perplexityKey: '',
  fireworksKey: '',
  deepseekKey: '',
  openrouterKey: '',
  lmstudioKey: '',
  ollamaKey: '',
  azureEndpoint: process.env.NEXT_PUBLIC_AZURE_ENDPOINT || '',
  customApiUrl: process.env.NEXT_PUBLIC_CUSTOM_API_URL || '',
  customApiHeaders: process.env.NEXT_PUBLIC_CUSTOM_API_HEADERS || '{}',
  customApiBody: process.env.NEXT_PUBLIC_CUSTOM_API_BODY || '{}',
  customApiStream: true,
  includeSystemMessagesInCustomApi:
    process.env.NEXT_PUBLIC_INCLUDE_SYSTEM_MESSAGES_IN_CUSTOM_API !== 'false',
  customApiIncludeMimeType:
    process.env.NEXT_PUBLIC_CUSTOM_API_INCLUDE_MIME_TYPE !== 'false',

  // Model Provider
  selectAIService:
    (process.env.NEXT_PUBLIC_SELECT_AI_SERVICE as AIService) || 'anthropic',
  selectAIModel: process.env.NEXT_PUBLIC_SELECT_AI_MODEL || 'claude-haiku-4-5',
  localLlmUrl: process.env.NEXT_PUBLIC_LOCAL_LLM_URL || '',

  // Character
  characterName: process.env.NEXT_PUBLIC_CHARACTER_NAME || 'Scensei',
  showAssistantText:
    process.env.NEXT_PUBLIC_SHOW_ASSISTANT_TEXT === 'true' ? true : false,
  showCharacterName:
    process.env.NEXT_PUBLIC_SHOW_CHARACTER_NAME === 'true' ? true : false,
  selectedVrmPath:
    process.env.NEXT_PUBLIC_SELECTED_VRM_PATH || '/vrm/Scensei.vrm',
  fixedCharacterPosition: false,
  characterPosition: {
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
  },
  characterRotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  lightingIntensity:
    parseFloat(process.env.NEXT_PUBLIC_LIGHTING_INTENSITY || '1.0') || 1.0,

  // General
  selectLanguage: (process.env.NEXT_PUBLIC_SELECT_LANGUAGE as Language) || 'ja',
  changeEnglishToJapanese:
    process.env.NEXT_PUBLIC_CHANGE_ENGLISH_TO_JAPANESE === 'true',
  includeTimestampInUserMessage:
    process.env.NEXT_PUBLIC_INCLUDE_TIMESTAMP_IN_USER_MESSAGE === 'true',
  showControlPanel: process.env.NEXT_PUBLIC_SHOW_CONTROL_PANEL !== 'false',
  showQuickMenu: process.env.NEXT_PUBLIC_SHOW_QUICK_MENU === 'true',
  externalLinkageMode: process.env.NEXT_PUBLIC_EXTERNAL_LINKAGE_MODE === 'true',
  messageReceiverEnabled:
    process.env.NEXT_PUBLIC_MESSAGE_RECEIVER_ENABLED === 'true',
  clientId: process.env.NEXT_PUBLIC_CLIENT_ID || '',
  useSearchGrounding: process.env.NEXT_PUBLIC_USE_SEARCH_GROUNDING === 'true',
  dynamicRetrievalThreshold:
    parseFloat(process.env.NEXT_PUBLIC_DYNAMIC_RETRIEVAL_THRESHOLD || '0.3') ||
    0.3,
  maxPastMessages:
    parseInt(process.env.NEXT_PUBLIC_MAX_PAST_MESSAGES || '10') || 10,
  useVideoAsBackground:
    process.env.NEXT_PUBLIC_USE_VIDEO_AS_BACKGROUND === 'true',
  temperature: parseFloat(process.env.NEXT_PUBLIC_TEMPERATURE || '1.0') || 1.0,
  maxTokens: parseInt(process.env.NEXT_PUBLIC_MAX_TOKENS || '4096') || 4096,
  presetQuestions: (
    process.env.NEXT_PUBLIC_PRESET_QUESTIONS?.split(',') || []
  ).map((text, index) => ({
    id: `preset-question-${index}`,
    text: text.trim(),
    order: index,
  })),
  showPresetQuestions:
    process.env.NEXT_PUBLIC_SHOW_PRESET_QUESTIONS !== 'false',
  chatLogWidth:
    parseFloat(process.env.NEXT_PUBLIC_CHAT_LOG_WIDTH || '550') || 550,
  imageDisplayPosition: (() => {
    const validPositions = ['input', 'side', 'icon'] as const
    const envPosition = process.env.NEXT_PUBLIC_IMAGE_DISPLAY_POSITION
    return validPositions.includes(envPosition as any)
      ? (envPosition as 'input' | 'side' | 'icon')
      : 'input'
  })(),
  multiModalMode: (() => {
    const validModes = ['ai-decide', 'always', 'never'] as const
    const envMode = process.env.NEXT_PUBLIC_MULTIMODAL_MODE
    return validModes.includes(envMode as any)
      ? (envMode as 'ai-decide' | 'always' | 'never')
      : 'ai-decide'
  })(),
  multiModalAiDecisionPrompt:
    process.env.NEXT_PUBLIC_MULTIMODAL_AI_DECISION_PROMPT ||
    'あなたは画像がユーザーの質問や会話の文脈に関連するかどうかを判断するアシスタントです。直近の会話履歴とユーザーメッセージを考慮して、「はい」または「いいえ」のみで答えてください。',
  enableMultiModal: process.env.NEXT_PUBLIC_ENABLE_MULTIMODAL !== 'false',
  colorTheme: 'scensei' as const,
  customModel: process.env.NEXT_PUBLIC_CUSTOM_MODEL === 'true',
})

const settingsStore = create<SettingsState>()(
  persist((set, get) => getInitialValuesFromEnv(), {
    name: 'aitube-kit-settings',
    onRehydrateStorage: () => (state) => {
      // Migrate OpenAI model names when loading from storage
      if (state && state.selectAIService === 'openai' && state.selectAIModel) {
        const migratedModel = migrateOpenAIModelName(state.selectAIModel)
        if (migratedModel !== state.selectAIModel) {
          state.selectAIModel = migratedModel
        }
      }

      // Override with environment variables if the option is enabled
      if (
        state &&
        process.env.NEXT_PUBLIC_ALWAYS_OVERRIDE_WITH_ENV_VARIABLES === 'true'
      ) {
        const envValues = getInitialValuesFromEnv()
        Object.assign(state, envValues)
      }

      // Refresh character name if it's old default
      if (state) {
        const envValues = getInitialValuesFromEnv()
        if (state.characterName === 'CHARACTER' || !state.characterName) {
          state.characterName = envValues.characterName
        }
      }
    },
    partialize: (state) => ({
      openaiKey: state.openaiKey,
      anthropicKey: state.anthropicKey,
      googleKey: state.googleKey,
      azureKey: state.azureKey,
      xaiKey: state.xaiKey,
      groqKey: state.groqKey,
      cohereKey: state.cohereKey,
      mistralaiKey: state.mistralaiKey,
      perplexityKey: state.perplexityKey,
      fireworksKey: state.fireworksKey,
      deepseekKey: state.deepseekKey,
      openrouterKey: state.openrouterKey,
      lmstudioKey: state.lmstudioKey,
      ollamaKey: state.ollamaKey,
      azureEndpoint: state.azureEndpoint,
      selectAIService: state.selectAIService,
      selectAIModel: state.selectAIModel,
      localLlmUrl: state.localLlmUrl,
      characterName: state.characterName,
      showAssistantText: state.showAssistantText,
      showCharacterName: state.showCharacterName,
      selectLanguage: state.selectLanguage,
      changeEnglishToJapanese: state.changeEnglishToJapanese,
      includeTimestampInUserMessage: state.includeTimestampInUserMessage,
      externalLinkageMode: state.externalLinkageMode,
      messageReceiverEnabled: state.messageReceiverEnabled,
      clientId: state.clientId,
      useSearchGrounding: state.useSearchGrounding,
      selectedVrmPath: state.selectedVrmPath,
      fixedCharacterPosition: state.fixedCharacterPosition,
      characterPosition: state.characterPosition,
      characterRotation: state.characterRotation,
      lightingIntensity: state.lightingIntensity,
      maxPastMessages: state.maxPastMessages,
      useVideoAsBackground: state.useVideoAsBackground,
      showQuickMenu: state.showQuickMenu,
      temperature: state.temperature,
      maxTokens: state.maxTokens,
      presetQuestions: state.presetQuestions,
      showPresetQuestions: state.showPresetQuestions,
      customApiUrl: state.customApiUrl,
      customApiHeaders: state.customApiHeaders,
      customApiBody: state.customApiBody,
      customApiStream: state.customApiStream,
      includeSystemMessagesInCustomApi: state.includeSystemMessagesInCustomApi,
      customApiIncludeMimeType: state.customApiIncludeMimeType,
      chatLogWidth: state.chatLogWidth,
      imageDisplayPosition: state.imageDisplayPosition,
      multiModalMode: state.multiModalMode,
      multiModalAiDecisionPrompt: state.multiModalAiDecisionPrompt,
      enableMultiModal: state.enableMultiModal,
      colorTheme: state.colorTheme,
      customModel: state.customModel,
    }),
  })
)

export default settingsStore
