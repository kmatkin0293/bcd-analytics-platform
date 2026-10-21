/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
const q = (id) => (id ? `&dashboard=${id}` : '')
const PATHS = {
  classic: {
    home: '/dashboards',
    view: (id) => `/dashboards/${id}`,
    search: (id) => `/studio?mode=search${q(id)}`,
    editChart: (id, vizId) => `/studio?mode=search&dashboard=${id}&edit=${vizId}`,
    shuttleViz: (id) => `/studio?mode=ai${q(id)}`,
  },
  lab: {
    home: '/labs',
    view: (id) => `/labs/dashboards/${id}`,
    search: (id) => `/labs/studio?mode=search${q(id)}`,
    editChart: (id, vizId) => `/labs/studio?mode=search&dashboard=${id}&edit=${vizId}`,
    shuttleViz: (id) => `/labs/shuttleviz/${id ?? 'new'}`,
  },
}
const ExperienceContext = createContext('classic')
function ExperienceProvider({ experience, children }) {
  return <ExperienceContext.Provider value={experience}>{children}</ExperienceContext.Provider>
}
const useExperience = () => useContext(ExperienceContext)
const usePaths = () => PATHS[useExperience()]
export { ExperienceProvider, useExperience, usePaths }
