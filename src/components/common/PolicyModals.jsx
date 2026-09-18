import { X, ShieldCheck, FileText } from 'lucide'
import { MorphIcon } from 'morphicons/react'

export function TermsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl border border-[#e2e8f0] relative">

        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm shrink-0">
              <MorphIcon icon={FileText} size={24} />
            </div>
            <div>
              <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] leading-tight">
                Terms & Conditions
              </h2>
              <p className="text-[#64748b] text-xs mt-1">QSAMS NDMC Portal • October 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors shrink-0"
          >
            <MorphIcon icon={X} size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm leading-relaxed opacity-90">
          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">1. Acceptance of Terms</h3>
            <p>By accessing, installing, or using the QSAMS Progressive Web Application (PWA) on any web browser, smartphone, or laptop, you agree to comply with and be bound by these Terms and Conditions. If you do not accept these terms, you must discontinue use of the platform immediately.</p>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">2. Scope and Purpose of the System</h3>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">Intended Use:</strong> QSAMS is designed exclusively for recording, monitoring, managing, and reviewing classroom attendance for authorized users at Notre Dame of Midsayap College.</li>
              <li><strong className="text-[#0f172a]">System Boundaries:</strong> The platform is delimitated strictly to attendance functions. It does not cover institutional enrollment, class scheduling, official grading, tuition management, or comprehensive student information system (SIS) administration.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">3. User Accounts and Eligibility</h3>
            <p className="mb-2">Access is restricted strictly to authorized teachers and enrolled students of Notre Dame of Midsayap College:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">Authorized Teachers:</strong> Faculty members granted permissions to create and manage classes, generate unique class codes and join QR codes, initiate attendance sessions, verify or manually edit attendance logs, and generate attendance summary reports.</li>
              <li><strong className="text-[#0f172a]">Enrolled Students:</strong> Students officially registered in a class with permissions to join class rosters via class codes or join QR codes, scan or present QR codes for session check-ins, and inspect personal attendance records.</li>
              <li><strong className="text-[#0f172a]">Account Confidentiality:</strong> Users are responsible for safeguarding login credentials and session tokens. Users must not share passwords, account access, or generated identification tokens with unauthorized third parties.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">4. Attendance Integrity and Anti-Proxy Policy</h3>
            <p className="mb-2">QSAMS implements anti-forgery measures, including dynamic QR codes that refresh at designated intervals and device-range location verification.</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">Prohibited Practices:</strong> Engaging in proxy attendance (checking in on behalf of an absent student), transmitting session QR code images/screenshots outside the classroom, mocking/spoofing GPS coordinates, or intercepting API communication is strictly prohibited.</li>
              <li><strong className="text-[#0f172a]">Institutional Action:</strong> Any attempt to manipulate, forge, or circumvent attendance verification protocols constitutes an academic integrity violation and will be reported to the NDMC administration for formal disciplinary procedures.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">5. Hardware and Connectivity Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">Camera Access:</strong> Users acknowledge that QR code scanning functions require an operational device camera.</li>
              <li><strong className="text-[#0f172a]">Internet Connection:</strong> Because QSAMS synchronizes attendance in real time using a cloud database, an active network connection is required. The institution and development team are not responsible for unrecorded attendance caused by hardware defects, browser incompatibility, or telecommunication outages; students encountering technical failures must notify their teacher immediately for in-session manual verification.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">6. Service Availability and System Modifications</h3>
            <p>The system administrators reserve the right to deploy updates, perform database maintenance, or alter functional features to maintain security, improve user experience, or comply with institutional guidelines.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#e2e8f0] shrink-0 bg-[#f8fafc] rounded-b-[24px]">
          <button onClick={onClose} className="btn-primary w-full justify-center py-3.5">
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  )
}

export function PrivacyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl border border-[#e2e8f0] relative">

        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center shadow-sm shrink-0">
              <MorphIcon icon={ShieldCheck} size={24} />
            </div>
            <div>
              <h2 className="font-['Source_Serif_4',Georgia,serif] text-2xl font-bold text-[#0f172a] leading-tight">
                Privacy Policy
              </h2>
              <p className="text-[#64748b] text-xs mt-1">QSAMS NDMC Portal • October 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors shrink-0"
          >
            <MorphIcon icon={X} size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm leading-relaxed opacity-90">
          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">1. Compliance Statement</h3>
            <p>This Privacy Policy outlines how the QR Code-Based Student Attendance Monitoring System (QSAMS) collects, processes, stores, and protects personal data in accordance with Republic Act No. 10173, otherwise known as the Philippine Data Privacy Act of 2012 (DPA).</p>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">2. Data Collected</h3>
            <p className="mb-2">QSAMS collects and processes only the personal and technical data required to execute attendance validation:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">Account & Profile Records:</strong> Full name, institutional Student ID number, system role (Teacher or Student), email address, user authentication credentials, and user profile picture URL.</li>
              <li><strong className="text-[#0f172a]">Classroom & Enrollment Records:</strong> Class names, course descriptions, room numbers, class schedules, class join codes, and student enrollment pairings.</li>
              <li><strong className="text-[#0f172a]">Attendance Session & Log Data:</strong> Attendance session tokens, check-in timestamps, attendance status (present, late, absent), scanning method used, faculty notes/remarks, attended session counts, and computed attendance rates.</li>
              <li><strong className="text-[#0f172a]">Geographic & Device Range Data:</strong> Device geolocation coordinates (latitude, longitude, and accuracy radius) captured strictly during the attendance scanning event to confirm physical presence within the designated classroom radius.</li>
              <li><strong className="text-[#0f172a]">Camera Sensor Access:</strong> Video feed permissions requested solely for real-time optical scanning of QR codes. No video recordings, camera snapshots, or biometric footage are stored on device memory or uploaded to external servers.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">3. Purpose and Legal Basis of Processing</h3>
            <p className="mb-2">Processing is carried out for the legitimate educational and operational requirements of Notre Dame of Midsayap College under Section 12 of RA 10173:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li>Facilitating classroom roll calls without manual paper sheets.</li>
              <li>Verifying physical presence to prevent fraudulent attendance reporting.</li>
              <li>Providing teachers and students with immediate access to attendance histories and attendance rate summaries.</li>
              <li>Generating formal digital attendance reports for institutional class management.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">4. Storage, Infrastructure, and Security</h3>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">Cloud Architecture:</strong> Data collected by QSAMS is stored and managed using Supabase cloud infrastructure backed by a PostgreSQL relational database.</li>
              <li><strong className="text-[#0f172a]">Security Controls:</strong> Application data is transmitted over encrypted connections (HTTPS/TLS). Access controls and database Row Level Security (RLS) enforce isolation so that students can access only their personal attendance logs, while teachers access only rosters associated with their assigned classes.</li>
              <li><strong className="text-[#0f172a]">Data Retention:</strong> Attendance records and session logs are retained throughout the active academic semester/school year for audit purposes, after which records are archived or deleted according to NDMC academic record policies.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">5. Third-Party Sharing and Disclosures</h3>
            <p className="mb-2">Personal data captured by QSAMS is never sold, rented, or commercialized. Access is limited strictly to:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li>The individual user regarding their personal profile and history.</li>
              <li>The assigned course teacher managing the class session.</li>
              <li>Authorized academic administrators of Notre Dame of Midsayap College upon legitimate institutional inquiry.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">6. Rights of the Data Subject</h3>
            <p className="mb-2">Under the Philippine Data Privacy Act of 2012, registered users maintain:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-[#005a36]">
              <li><strong className="text-[#0f172a]">The Right to Be Informed:</strong> To understand what personal data is processed and why.</li>
              <li><strong className="text-[#0f172a]">The Right to Access:</strong> To review their personal attendance history, session counts, and profile records at any time through the system interface.</li>
              <li><strong className="text-[#0f172a]">The Right to Rectification:</strong> To request corrections of inaccurate or disputed attendance logs through their assigned teacher.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[#0f172a] text-base mb-1">7. Inquiries and Contact</h3>
            <p>For inquiries regarding these policies or data governance practices within QSAMS, contact the College of Information Technology and Engineering (CITE) at Notre Dame of Midsayap College, Midsayap, Cotabato.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#e2e8f0] shrink-0 bg-[#f8fafc] rounded-b-[24px]">
          <button onClick={onClose} className="btn-primary w-full justify-center py-3.5">
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  )
}
