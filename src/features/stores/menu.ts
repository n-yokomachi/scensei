import { create } from 'zustand'

type SettingsTabKey = 'based' | 'character' | 'ai' | 'log' | 'other'

interface MenuState {
  fileInput: HTMLInputElement | null
  bgFileInput: HTMLInputElement | null
  activeSettingsTab: SettingsTabKey
}

const menuStore = create<MenuState>(() => ({
  fileInput: null,
  bgFileInput: null,
  activeSettingsTab: 'based',
}))

export default menuStore
