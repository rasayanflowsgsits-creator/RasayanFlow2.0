import useAuthStore from '../store/authStore';
import BPharmDashboard from './BPharmDashboard';
import ResearchDashboard from './ResearchDashboard';

import StudentOnboardingModal from '../components/student/StudentOnboardingModal';

export default function StudentDashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      {!user?.onboardingComplete && <StudentOnboardingModal />}
      {user?.course === 'M.Pharm' || user?.course === 'PhD' ? (
        <ResearchDashboard />
      ) : (
        <BPharmDashboard />
      )}
    </>
  );
}
