// User and Profile Types
export interface UserProfile {
  type: 'student' | 'faculty';
  docId?: string;
  status?: string;
  preferences?: Record<string, any>;
}

export interface PersonalInfo {
  name: string;
  email: string;
  createdAt?: any;
  lastLoginAt?: any;
}

export interface UserData {
  uid: string;
  email: string | null;
  personalInfo?: PersonalInfo;
  profile?: UserProfile;
  type?: 'student' | 'faculty';
  code?: string;
  createdAt?: any;
  metadata?: {
    emailVerified?: boolean;
    profileComplete?: boolean;
    termsAccepted?: any;
    lastUpdated?: any;
  };
}

// Student Profile Types
export interface AcademicInfo {
  studentId?: string;
  year?: string;
  major?: string;
  department?: string;
  gpa?: number;
  expectedGraduation?: string | null;
}

export interface Preferences {
  preferredDepartments: string[];
  consultationTypes: string[];
  notificationSettings: Record<string, any>;
}

export interface Statistics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

export interface StudentProfileData {
  code?: string;
  academicInfo?: AcademicInfo;
  preferences?: Preferences;
  statistics?: Statistics;
}

// Faculty Profile Types
export interface FacultyAcademicInfo {
  employeeId?: string;
  title?: string;
  department?: string;
  office?: string;
  expertise?: string[];
  education?: string[];
  publications?: number;
  yearsExperience?: number;
}

export interface ConsultationSettings {
  defaultDuration?: number;
  maxDailyAppointments?: number;
  bufferTime?: number;
  advanceBookingDays?: number;
  consultationTypes?: string[];
}

export interface Availability {
  weeklySchedule?: Record<string, any>;
  timeZone?: string;
}

export interface FacultyStatistics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageRating: number;
}

export interface FacultyProfileData {
  code?: string;
  academicInfo?: FacultyAcademicInfo;
  consultationSettings?: ConsultationSettings;
  availability?: Availability;
  statistics?: FacultyStatistics;
}

// Appointment Types
export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  requestedTime: string;
  reason: string;
  status: 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'cancelled' | 'completed';
  createdAt: any;
  updatedAt?: any;
  rescheduleReason?: string;
  rescheduleTime?: string;
}

// Form Data Types
export interface LoginFormData {
  email: string;
  password: string;
  userType: 'student' | 'faculty';
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'student' | 'faculty';
}

// API Response Types
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserData;
  requiresVerification?: boolean;
}

export interface ProfileResult {
  success: boolean;
  error?: string;
}

// Department Type
export interface Department {
  id: string;
  name: string;
  [key: string]: any;
}

// Faculty Directory Type
export interface FacultyMember {
  id: string;
  name: string;
  email: string;
  department: string;
  title: string;
  office: string;
  expertise: string[];
  [key: string]: any;
}
