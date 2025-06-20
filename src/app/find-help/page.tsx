import { LocationProvider } from '@/contexts/LocationContext';
import FindHelpContainer from '@/components/FindHelp/FindHelpContainer';

export default function FindHelpPage() {
  return (
    <LocationProvider>
      <FindHelpContainer />
    </LocationProvider>
  );
}
