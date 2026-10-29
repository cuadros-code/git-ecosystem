import { Landing } from '../features/explorer/Landing'
import { ExplorerScreen } from '../features/explorer/ExplorerScreen'
import { useExplorer } from '../features/explorer/useExplorer'

export default function App() {
  const model = useExplorer()
  if (!model.repository) return <Landing input={model.input} setInput={model.setInput} fieldError={model.fieldError} loadError={model.loadError} isLoading={model.isLoading} onSubmit={model.openRepository} onOpenDemo={model.openDemo} />
  return <ExplorerScreen model={model} repository={model.repository} />
}
