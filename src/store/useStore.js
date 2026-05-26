import { createContext, useContext } from 'react'

export const StoreContext = createContext(null)

export function useStore() {
  return useContext(StoreContext)
}
