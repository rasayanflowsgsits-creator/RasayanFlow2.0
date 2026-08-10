import React from 'react';
import useAuthStore from '../store/authStore';
import BPharmDashboard from './BPharmDashboard';
import ResearchDashboard from './ResearchDashboard';

import StudentOnboardingModal from '../components/student/StudentOnboardingModal';

export default function StudentDashboard() {
  const user = useAuthStore((state) => state.user);

  // Profile is complete only when the student has saved their year, semester AND roll number
  const isProfileComplete = Boolean(
    user?.isPreview ||
    (user?.role && user.role !== 'student') ||
    (
      (user?.onboardingComplete || localStorage.getItem(`pharmlab-onboarding-complete-${user?._id}`) === 'true' || localStorage.getItem('pharmlab-onboarding-complete') === 'true') &&
      user?.rollNumber &&
      user?.year &&
      user?.semester
    )
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
