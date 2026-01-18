import { useTranslation } from 'react-i18next'
import Image from 'next/image'

import homeStore from '@/features/stores/home'
import settingsStore, { SettingsState } from '@/features/stores/settings'
import toastStore from '@/features/stores/toast'

// Character型の定義
type Character = Pick<
  SettingsState,
  | 'systemPrompt'
  | 'characterPreset1'
  | 'characterPreset2'
  | 'characterPreset3'
  | 'characterPreset4'
  | 'characterPreset5'
  | 'customPresetName1'
  | 'customPresetName2'
  | 'customPresetName3'
  | 'customPresetName4'
  | 'customPresetName5'
  | 'selectedPresetIndex'
>

const Character = () => {
  const { t } = useTranslation()
  const {
    fixedCharacterPosition,
    selectAIService,
    systemPrompt,
    characterPreset1,
    characterPreset2,
    characterPreset3,
    characterPreset4,
    characterPreset5,
    customPresetName1,
    customPresetName2,
    customPresetName3,
    customPresetName4,
    customPresetName5,
    selectedPresetIndex,
    lightingIntensity,
  } = settingsStore()

  const characterPresets = [
    {
      key: 'characterPreset1',
      value: characterPreset1,
    },
    {
      key: 'characterPreset2',
      value: characterPreset2,
    },
    {
      key: 'characterPreset3',
      value: characterPreset3,
    },
    {
      key: 'characterPreset4',
      value: characterPreset4,
    },
    {
      key: 'characterPreset5',
      value: characterPreset5,
    },
  ]

  const customPresetNames = [
    customPresetName1,
    customPresetName2,
    customPresetName3,
    customPresetName4,
    customPresetName5,
  ]

  const handlePositionAction = (action: 'fix' | 'unfix' | 'reset') => {
    try {
      const { viewer } = homeStore.getState()

      const methodMap = {
        fix: 'fixCameraPosition',
        unfix: 'unfixCameraPosition',
        reset: 'resetCameraPosition',
      }
      const method = methodMap[action]
      if (viewer && typeof (viewer as any)[method] === 'function') {
        ;(viewer as any)[method]()
      } else {
        throw new Error(`VRM viewer method ${method} not available`)
      }

      const messageMap = {
        fix: t('Toasts.PositionFixed'),
        unfix: t('Toasts.PositionUnfixed'),
        reset: t('Toasts.PositionReset'),
      }

      toastStore.getState().addToast({
        message: messageMap[action],
        type: action === 'fix' ? 'success' : 'info',
        tag: `position-${action}`,
      })
    } catch (error) {
      console.error(`Position ${action} failed:`, error)
      toastStore.getState().addToast({
        message: t('Toasts.PositionActionFailed'),
        type: 'error',
        tag: 'position-error',
      })
    }
  }

  return (
    <>
      <div className="flex items-center mb-6">
        <Image
          src="/images/setting-icons/character-settings.svg"
          alt="Character Settings"
          width={24}
          height={24}
          className="mr-2"
        />
        <h2 className="text-2xl font-bold">{t('CharacterSettings')}</h2>
      </div>
      <div className="">
        {/* Character Position Controls */}
        <div className="my-6">
          <div className="text-xl font-bold mb-4">{t('CharacterPosition')}</div>
          <div className="mb-4">{t('CharacterPositionInfo')}</div>
          <div className="mb-2 text-sm font-medium">
            {t('CurrentStatus')}:{' '}
            <span className="font-bold">
              {fixedCharacterPosition
                ? t('PositionFixed')
                : t('PositionNotFixed')}
            </span>
          </div>
          <div className="flex gap-4 md:flex-row flex-col">
            <button
              onClick={() => handlePositionAction('fix')}
              className="px-4 py-3 text-theme font-medium bg-primary hover:bg-primary-hover active:bg-primary-press rounded-lg transition-colors duration-200 md:rounded-full md:px-6 md:py-2"
            >
              {t('FixPosition')}
            </button>
            <button
              onClick={() => handlePositionAction('unfix')}
              className="px-4 py-3 text-theme font-medium bg-primary hover:bg-primary-hover active:bg-primary-press rounded-lg transition-colors duration-200 md:rounded-full md:px-6 md:py-2"
            >
              {t('UnfixPosition')}
            </button>
            <button
              onClick={() => handlePositionAction('reset')}
              className="px-4 py-3 text-theme font-medium bg-primary hover:bg-primary-hover active:bg-primary-press rounded-lg transition-colors duration-200 md:rounded-full md:px-6 md:py-2"
            >
              {t('ResetPosition')}
            </button>
          </div>
        </div>

        {/* VRM Lighting Controls */}
        <div className="my-6">
          <div className="text-xl font-bold mb-4">照明の強度</div>
          <div className="mb-4">
            VRMキャラクターの照明の明るさを調整します。
          </div>
          <div className="font-bold">
            照明の強度: {lightingIntensity.toFixed(1)}
          </div>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={lightingIntensity}
            onChange={(e) => {
              const intensity = parseFloat(e.target.value)
              settingsStore.setState({ lightingIntensity: intensity })
              const { viewer } = homeStore.getState()
              if (
                viewer &&
                typeof viewer.updateLightingIntensity === 'function'
              ) {
                viewer.updateLightingIntensity(intensity)
              }
            }}
            className="mt-2 mb-4 input-range"
          />
        </div>

        <div className="my-6 mb-2">
          <div className="my-4 text-xl font-bold">
            {t('CharacterSettingsPrompt')}
          </div>
          {selectAIService === 'dify' ? (
            <div className="my-4">{t('DifyInstruction')}</div>
          ) : (
            <div className="my-4 whitespace-pre-line">
              {t('CharacterSettingsInfo')}
            </div>
          )}
        </div>
        <div className="my-4 whitespace-pre-line">
          {t('CharacterpresetInfo')}
        </div>
        <div className="my-6 mb-2">
          <div className="flex flex-wrap gap-2 mb-4" role="tablist">
            {characterPresets.map(({ key, value }, index) => {
              const customName = customPresetNames[index]
              const isSelected = selectedPresetIndex === index

              return (
                <button
                  key={key}
                  onClick={() => {
                    // プリセット選択時に内容を表示し、systemPromptも更新
                    settingsStore.setState({
                      selectedPresetIndex: index,
                      systemPrompt: value,
                    })

                    toastStore.getState().addToast({
                      message: t('Toasts.PresetSwitching', {
                        presetName: customName,
                      }),
                      type: 'info',
                      tag: `character-preset-switching`,
                    })
                  }}
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      settingsStore.setState({
                        selectedPresetIndex: index,
                        systemPrompt: value,
                      })

                      toastStore.getState().addToast({
                        message: t('Toasts.PresetSwitching', {
                          presetName: customName,
                        }),
                        type: 'info',
                        tag: `character-preset-switching`,
                      })
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm ${
                    isSelected
                      ? 'bg-primary text-theme'
                      : 'bg-surface1 hover:bg-surface1-hover text-gray-800 bg-white'
                  }`}
                >
                  {customName}
                </button>
              )
            })}
          </div>

          {characterPresets.map(({ key }, index) => {
            const customNameKey =
              `customPresetName${index + 1}` as keyof Character
            const customName = customPresetNames[index]
            const isSelected = selectedPresetIndex === index

            if (!isSelected) return null

            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => {
                      settingsStore.setState({
                        [customNameKey]: e.target.value,
                      })
                    }}
                    aria-label={t('PresetNameLabel', {
                      defaultValue: 'Preset Name',
                    })}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm w-full"
                    placeholder={t(`Characterpreset${index + 1}`)}
                  />
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => {
                    const newValue = e.target.value
                    // システムプロンプトとプリセットの内容を同時に更新
                    settingsStore.setState({
                      systemPrompt: newValue,
                      [key]: newValue,
                    })
                  }}
                  aria-label={t('SystemPromptLabel', {
                    defaultValue: 'System Prompt',
                  })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md w-full h-64 text-sm"
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
export default Character
