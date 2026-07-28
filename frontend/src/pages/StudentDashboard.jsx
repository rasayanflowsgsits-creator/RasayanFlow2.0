import useAuthStore from '../store/authStore';
import BPharmDashboard from './BPharmDashboard';
import ResearchDashboard from './ResearchDashboard';

export default function StudentDashboard() {
  const user = useAuthStore((state) => state.user);

  if (user?.course === 'M.Pharm' || user?.course === 'PhD') {
    return <ResearchDashboard />;
  }

  // Default to B.Pharm dashboard
  return <BPharmDashboard />;
}
