import { LexoraTeamMember } from '../app/core/models/lexora-team-member.model';

export const environment = {
  production: false,
  baseUrl: '',
  apiUrl: 'https://localhost:7050/api/v1',
  mockApi: false,
  appName: 'Lexora',
  email: 'institution@slms.com',
  password: 'Demo@12345',
  TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  ACCESS_TOKEN_EXPIRES_KEY: 'access_token_expires',
  REFRESH_TOKEN_EXPIRES_KEY: 'refresh_token_expires',
  USER_KEY: 'user',
  TENANT_KEY: 'tenant',
  STORAGE_KEY: 'slms_auth',
  MOCK_OTP: '123456',
  lexoraTeam: [
    {
      name: 'Yogesh Yadav',
      role: 'Founder & Product Lead',
      bio: 'Leads Lexora product vision for multi-branch library institutions.',
      email: 'yogesh@lexora.app',
      linkedIn: 'https://www.linkedin.com/',
    },
    {
      name: 'Platform Engineering',
      role: 'Backend & Multi-Tenant Architecture',
      bio: 'Builds secure APIs, tenant isolation, and institution workflows.',
      email: 'engineering@lexora.app',
    },
    {
      name: 'Experience Design',
      role: 'UI/UX & Frontend',
      bio: 'Crafts admin dashboards, member flows, and landing experiences.',
      email: 'design@lexora.app',
    },
    {
      name: 'Customer Success',
      role: 'Onboarding & Support',
      bio: 'Helps institutions launch branches, libraries, and member operations.',
      email: 'support@lexora.app',
    },
  ] as LexoraTeamMember[],
};

