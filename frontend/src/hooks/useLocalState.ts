import { useState } from 'react'

/**
 * Hook that allows getting a state variable that is also saved in local storage (only supporsed JSON-convertable data types)
 * @param localStorageName Name of the local storage item
 * @param defaultValue Value to use if there is no local data
 * @returns Same as a React state, a tuple with first element being the value, second an updater function, the difference being only that the updater function must receive the new value and there's no setter functionality
 */
export function useLocalState<T> (localStorageName: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const local = localStorage.getItem(localStorageName)
    if (local === null) {
      return defaultValue
    } else {
      return JSON.parse(local) as T
    }
  })

  const updateValue = (value: T): void => {
    localStorage.setItem(localStorageName, JSON.stringify(value))
    setValue(value)
  }

  return [value, updateValue]
}
