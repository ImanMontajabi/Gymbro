import { useState } from 'react'
import Icon from './Icon'
import { useLanguage } from '../context/LanguageContext'

// Shared inline "text input + confirm + cancel" row, used for renaming a
// routine/exercise and for the two "add new" forms.
export default function NameEditRow({ initialValue, placeholder, onSave, onCancel, isSaving = false }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(initialValue)

  function save() {
    const trimmed = draft.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        autoFocus
        type="text"
        value={draft}
        placeholder={placeholder}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
        }}
        className="min-w-0 flex-1 rounded-lg border border-[rgb(var(--ctp-mauve))] bg-[rgb(var(--ctp-mantle))] px-3 py-3.5 text-base text-[rgb(var(--ctp-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))] disabled:opacity-60"
      />
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        aria-label={t('save')}
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3.5 text-[rgb(var(--ctp-green))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] active:scale-90 active:opacity-70 disabled:opacity-60"
      >
        {isSaving ? (
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--ctp-green))] border-t-transparent" />
        ) : (
          <Icon name="check" className="text-[20px]" />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        aria-label={t('wtCancel')}
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-red))] active:scale-90 active:opacity-70 disabled:opacity-60"
      >
        <Icon name="close" className="text-[20px]" />
      </button>
    </div>
  )
}
