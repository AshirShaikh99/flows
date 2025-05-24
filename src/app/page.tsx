import FlowBuilder from '../components/FlowBuilder';
import { FlowProvider } from '../lib/flow-context';

export default function Home() {
  return (
    <FlowProvider>
      <div className="w-full h-screen overflow-hidden">
        <FlowBuilder />
      </div>
    </FlowProvider>
  );
}
