import React from 'react';
import {
  Quiz as QuizIcon,
  People as PeopleIcon,
  Apartment as ApartmentIcon,
  LibraryBooks as RepoIcon,
  NotificationsActive as NotificationsIcon,
  History as HistoryIcon,
  Storefront as StorefrontIcon,
  FlashOn as FlashOnIcon,
  MenuBook as MenuBookIcon,
  EditNote as EditNoteIcon,
  FlagOutlined as FlagIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

export const getBasePath = (role) =>
  role === 'school_admin' ? '/school' : role === 'subject_specialist' ? '/specialist' : '/admin';

/**
 * Single source of truth for dashboard navigation. Returns role-aware sections
 * consumed by BOTH the sidebar and the Dashboard Home action grid.
 * Each item: { text, desc, icon, path, color }
 */
export function getDashboardSections(role) {
  if (role === 'admin') {
    return [
      {
        title: 'School Management',
        items: [
          { text: 'Exams', desc: 'Create & manage assessments', icon: <QuizIcon />, path: '/admin/exams', color: 'blue' },
          { text: 'Students', desc: 'Accounts & enrollments', icon: <PeopleIcon />, path: '/admin/students', color: 'indigo' },
          { text: 'Schools', desc: 'Institutions & admins', icon: <ApartmentIcon />, path: '/admin/schools', color: 'orange' },
          { text: 'Question Repository', desc: 'Shared question bank', icon: <RepoIcon />, path: '/admin/repository/questions', color: 'success' },
          { text: 'Requests', desc: 'Student approvals', icon: <NotificationsIcon />, path: '/admin/requests', color: 'warning' },
          { text: 'Activity Log', desc: 'Audit trail', icon: <HistoryIcon />, path: '/admin/activity-log', color: 'blue' },
        ],
      },
      {
        title: 'Public Portal',
        items: [
          { text: 'Courses & Content', desc: 'B2C catalog & uploads', icon: <MenuBookIcon />, path: '/admin/portal', color: 'orange' },
          { text: 'Subscriptions', desc: 'Enrolled public users', icon: <PeopleIcon />, path: '/admin/portal/subscriptions', color: 'indigo' },
          { text: 'Question Bank', desc: 'Competitive repository', icon: <RepoIcon />, path: '/admin/portal/question-bank', color: 'blue' },
        ],
      },
      {
        title: 'Quick Exams',
        items: [
          { text: 'Quick Exams', desc: 'Zero-auth shareable tests', icon: <FlashOnIcon />, path: '/admin/quick', color: 'orange' },
        ],
      },
    ];
  }

  if (role === 'school_admin') {
    return [
      {
        title: 'School Management',
        items: [
          { text: 'Analytics', desc: 'Performance insights', icon: <AssessmentIcon />, path: '/school/analysis', color: 'orange' },
          { text: 'Students', desc: 'Accounts & enrollments', icon: <PeopleIcon />, path: '/school/students', color: 'blue' },
          { text: 'Exams', desc: 'Create & manage assessments', icon: <QuizIcon />, path: '/school/exams', color: 'indigo' },
          { text: 'Question Repository', desc: 'Shared question bank', icon: <RepoIcon />, path: '/school/repository/questions', color: 'success' },
          { text: 'Requests', desc: 'Student approvals', icon: <NotificationsIcon />, path: '/school/requests', color: 'warning' },
        ],
      },
    ];
  }

  // subject_specialist
  return [
    {
      title: 'Question Repository',
      items: [
        { text: 'Question Repository', desc: 'Browse & edit questions', icon: <RepoIcon />, path: '/specialist/repository/questions', color: 'blue' },
        { text: 'Bulk Edit', desc: 'Edit many at once', icon: <EditNoteIcon />, path: '/specialist/repository/bulk-edit', color: 'indigo' },
        { text: 'Reports', desc: 'Resolve flagged questions', icon: <FlagIcon />, path: '/specialist/repository/reports', color: 'orange' },
        { text: 'Activity Log', desc: 'Your edit history', icon: <HistoryIcon />, path: '/specialist/activity-log', color: 'success' },
      ],
    },
  ];
}
