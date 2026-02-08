import { useTranslation } from 'react-i18next'
import Image from 'next/image'

import settingsStore from '@/features/stores/settings'
import AdvancedSettings from './advancedSettings'
import { TextButton } from '../textButton'

const Other = () => {
  const { t } = useTranslation()
  const showPresetQuestions = settingsStore((s) => s.showPresetQuestions)

  const handleToggleShowPresetQuestions = () => {
    settingsStore.setState({
      showPresetQuestions: !showPresetQuestions,
    })
  }

  return (
    <>
      <div className="flex items-center mb-6">
        <Image
          src="/images/setting-icons/other-settings.svg"
          alt="Other Settings"
          width={24}
          height={24}
          className="mr-2"
        />
        <h2 className="text-2xl font-bold">{t('OtherSettings')}</h2>
      </div>

      <AdvancedSettings />

      <div className="mb-10">
        <div className="mb-6">
          <div className="mb-4 text-xl font-bold">{t('PresetQuestions')}</div>
          <div className="my-4">
            <TextButton onClick={handleToggleShowPresetQuestions}>
              {t(showPresetQuestions ? 'StatusOn' : 'StatusOff')}
            </TextButton>
          </div>
        </div>
      </div>
    </>
  )
}
export default Other
