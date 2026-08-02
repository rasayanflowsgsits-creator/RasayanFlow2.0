import React from 'react';
import useAuthStore from '../store/authStore';
import BPharmDashboard from './BPharmDashboard';
import ResearchDashboard from './ResearchDashboard';

import StudentOnboardingModal from '../components/student/StudentOnboardingModal';

export default function StudentDashboard() {
  const user = useAuthStore((state) => state.user);

  // Check if student profile setup is complete
  const isProfileComplete = Boolean(
    user?.onboardingComplete ||
    user?.rollNumber ||
    user?.course ||
    user?.year ||
    user?.isPreview ||
    (typeof localStorage !== 'undefined' && user?._id && localStorage.getItem(`pharmlab-onboarding-complete-${user._id}`) === 'true') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('pharmlab-onboarding-complete') === 'true')
  );

  return (
    <>
      {!isProfileComplete && <StudentOnboardingModal />}
      {user?.course === 'M.Pharm' || user?.course === 'PhD' ? (
        <ResearchDashboard />
      ) : (
        <BPharmDashboard />
      )}
    </>
  );
}
