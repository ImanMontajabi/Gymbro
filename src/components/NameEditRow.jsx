import { useState } from 'react'
import Icon from './Icon'

// Shared inline "text input + confirm + cancel" row, used for renaming a
// routine/exercise and for the two "add new" forms.
export default function NameEditRow({ initialValue, placeholder, onSave, onCancel, isSaving = false }) {
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
        className="min-w-0 flex-1 rounded-lg border border-purple-400 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        aria-label="ذخیره"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-green-600 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:text-green-400 dark:hover:bg-gray-800"
      >
        {isSaving ? (
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-green-600 border-t-transparent dark:border-green-400" />
        ) : (
          <Icon name="check" className="text-[20px]" />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        aria-label="لغو"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 disabled:opacity-60 dark:hover:bg-gray-800"
      >
        <Icon name="close" className="text-[20px]" />
      </button>
    </div>
  )
}
