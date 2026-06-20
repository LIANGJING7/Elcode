import Layout from './components/Layout'

export default function App() {
  return (
    <Layout connectionStatus="disconnected">
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    </Layout>
  )
}