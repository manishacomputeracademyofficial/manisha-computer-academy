import { useState } from 'react'

// Generate roll number deterministically
function generateRollNumber(batchCode, index, allStudents = []) {
  if (batchCode && batchCode.startsWith('OSCIT')) {
    const oscitStudents = allStudents.filter(s => s && s.batch && s.batch.startsWith('OSCIT'))
    const nextSeq = oscitStudents.length > 0 ? oscitStudents.length + 1 : index
    return `MCA-${String(nextSeq).padStart(3, '0')}`
  }
  return `DC-${batchCode || 'GEN'}-${String(index).padStart(2, '0')}`
}

// Generate detailed GitHub-style attendance history from the joining month
function generateDetailedHistory(joiningMonthName, name) {
  const now = new Date()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const strMonth = typeof joiningMonthName === 'string' ? joiningMonthName : 'July 2026'
  const parts = strMonth.split(' ')
  const monthIdx = months.indexOf(parts[0]) !== -1 ? months.indexOf(parts[0]) : 6
  const year = parseInt(parts[1]) || 2026

  const startDate = new Date(year, monthIdx, 1)
  const data = []
  const safeName = typeof name === 'string' && name.trim() ? name : 'Student'
  
  const loopDate = new Date(startDate)
  let limit = 0
  while (loopDate <= now && limit < 150) {
    limit++
    if (loopDate.getDay() !== 0) {
      const charCode = safeName.charCodeAt(0) || 83
      const seed = charCode * 7 + loopDate.getDate() * 13 + loopDate.getMonth() * 3
      const present = seed % 5 !== 0
      const level = present ? (3 + (seed % 2)) : 0
      data.push({
        date: loopDate.toISOString().split('T')[0],
        present,
        level,
        day: loopDate.getDate(),
      })
    }
    loopDate.setDate(loopDate.getDate() + 1)
  }
  return data
}

export default function Students({
  students = [],
  setStudents,
  batches = [],
  selectedBatchFilter = '',
  setSelectedBatchFilter,
  hasPasswordColumn = false,
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showOcrModal, setShowOcrModal] = useState(false)
  const [activeProfileStudent, setActiveProfileStudent] = useState(null)
  const [ocrResults, setOcrResults] = useState(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [showPlainPasswordMap, setShowPlainPasswordMap] = useState({})
  
  // New Student State (5 New Fields: address, learnerCode, admissionDate, oscitUserId, oscitPassword kept blank initially)
  const [newStudent, setNewStudent] = useState({
    name: '',
    phone: '',
    password: '',
    batch: batches[0]?.code || 'OSCIT_12PM',
    email: '',
    rollNumber: '',
    address: '',
    learnerCode: '',
    admissionDate: '',
    oscitUserId: '',
    oscitPassword: '',
  })
  
  const [editingStudent, setEditingStudent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStudents = students.filter(s => {
    if (!s) return false
    const nameVal = s.name || ''
    const rollVal = s.rollNumber || ''
    const batchVal = s.batch || ''
    const learnerVal = s.learnerCode || s.learner_code || ''
    const oscitVal = s.oscitUserId || s.oscit_user_id || ''
    
    const matchesSearch = nameVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rollVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batchVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learnerVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      oscitVal.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesBatch = selectedBatchFilter ? s.batch === selectedBatchFilter : true
    return matchesSearch && matchesBatch
  })

  const openAddModal = () => {
    const defaultBatch = selectedBatchFilter || batches[0]?.code || 'OSCIT_12PM'
    const batchStudents = students.filter(s => s && s.batch === defaultBatch)
    const nextIndex = batchStudents.length + 1
    const todayStr = new Date().toISOString().split('T')[0]
    setNewStudent({
      name: '',
      phone: '',
      password: '',
      batch: defaultBatch,
      email: '',
      rollNumber: generateRollNumber(defaultBatch, nextIndex, students),
      address: '',
      learnerCode: '',
      admissionDate: todayStr,
      oscitUserId: '',
      oscitPassword: '',
    })
    setShowAddModal(true)
  }

  const handleAddNameChange = (name) => {
    const emailName = name.toLowerCase().trim().replace(/\s+/g, '.')
    const generatedEmail = emailName ? `${emailName}@gmail.com` : ''
    const firstName = name.trim().split(' ')[0] || 'MCA'
    const generatedPassword = `${firstName}@123`

    setNewStudent(prev => ({
      ...prev,
      name,
      email: generatedEmail,
      password: prev.password || generatedPassword,
    }))
  }

  const handleAddBatchChange = (batch) => {
    const batchStudents = students.filter(s => s && s.batch === batch)
    const nextIndex = batchStudents.length + 1
    const generatedRoll = generateRollNumber(batch, nextIndex, students)
    const firstName = newStudent.name.trim().split(' ')[0] || 'MCA'
    const generatedPassword = `${firstName}@123`

    setNewStudent(prev => ({
      ...prev,
      batch,
      rollNumber: generatedRoll,
      password: newStudent.name ? generatedPassword : prev.password,
    }))
  }

  const handleManualAdd = () => {
    if (!newStudent.name.trim()) return
    const currentMonthYear = new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })
    const maxId = students.reduce((max, s) => (s && s.id > max) ? s.id : max, 0)
    
    const student = {
      id: maxId + 1,
      name: newStudent.name,
      phone: newStudent.phone || 'Not provided',
      password: newStudent.password || `${newStudent.name.trim().split(' ')[0]}@123`,
      email: newStudent.email || `${newStudent.name.toLowerCase().trim().replace(/\s+/g, '.')}@gmail.com`,
      joiningMonth: currentMonthYear,
      avatar: '/student_avatar.png',
      batch: newStudent.batch,
      rollNumber: newStudent.rollNumber,
      aiUsed: 0,
      aiTotal: 150,
      address: newStudent.address || '',
      learnerCode: newStudent.learnerCode || '',
      learner_code: newStudent.learnerCode || '',
      admissionDate: newStudent.admissionDate || '',
      admission_date: newStudent.admissionDate || '',
      oscitUserId: newStudent.oscitUserId || '',
      oscit_user_id: newStudent.oscitUserId || '',
      oscitPassword: newStudent.oscitPassword || '',
      oscit_password: newStudent.oscitPassword || '',
    }
    setStudents([...students, student])
    setShowAddModal(false)
  }

  const openEditModal = (student) => {
    if (!student) return
    setEditingStudent({
      id: student.id,
      name: student.name || '',
      phone: student.phone || '',
      password: student.password || student.phone || 'MCA@123',
      batch: student.batch || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      joiningMonth: student.joiningMonth || 'July 2026',
      avatar: student.avatar || '/student_avatar.png',
      aiUsed: student.aiUsed || 0,
      aiTotal: student.aiTotal || 150,
      address: student.address || '',
      learnerCode: student.learnerCode || student.learner_code || '',
      admissionDate: student.admissionDate || student.admission_date || '',
      oscitUserId: student.oscitUserId || student.oscit_user_id || '',
      oscitPassword: student.oscitPassword || student.oscit_password || '',
    })
    setShowEditModal(true)
    setActiveProfileStudent(null)
  }

  const handleEditNameChange = (name) => {
    const emailName = name.toLowerCase().trim().replace(/\s+/g, '.')
    const generatedEmail = emailName ? `${emailName}@gmail.com` : ''
    
    setEditingStudent(prev => ({
      ...prev,
      name,
      email: generatedEmail,
    }))
  }

  const handleEditBatchChange = (batch) => {
    const batchStudents = students.filter(s => s && s.batch === batch)
    const nextIndex = batchStudents.length + 1
    const generatedRoll = generateRollNumber(batch, nextIndex, students)
    
    setEditingStudent(prev => ({
      ...prev,
      batch,
      rollNumber: generatedRoll,
    }))
  }

  const handleSaveEdit = () => {
    if (!editingStudent || !editingStudent.name.trim()) return
    const updated = {
      ...editingStudent,
      learner_code: editingStudent.learnerCode,
      admission_date: editingStudent.admissionDate,
      oscit_user_id: editingStudent.oscitUserId,
      oscit_password: editingStudent.oscitPassword,
    }
    setStudents(prev => prev.map(s => (s && s.id === editingStudent.id) ? updated : s))
    setShowEditModal(false)
    setEditingStudent(null)
  }

  const handleDeleteStudent = (id) => {
    if (window.confirm("Are you sure you want to delete this student from the registry?")) {
      setStudents(prev => prev.filter(s => s && s.id !== id))
      setShowEditModal(false)
      setEditingStudent(null)
    }
  }

  const handleOcrConfirm = () => {
    if (!ocrResults) return
    const batch = selectedBatchFilter || batches[0]?.code || 'OSCIT_12PM'
    const currentBatchCount = students.filter(s => s && s.batch === batch).length
    const currentMonthYear = new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })
    const maxId = students.reduce((max, s) => (s && s.id > max) ? s.id : max, 0)
    const todayStr = new Date().toISOString().split('T')[0]
    
    let tempStudents = [...students]
    const newStudents = ocrResults.map((r, i) => {
      const emailName = r.name.toLowerCase().trim().replace(/\s+/g, '.')
      const generatedRoll = generateRollNumber(batch, currentBatchCount + i + 1, tempStudents)
      const firstName = r.name.trim().split(' ')[0] || 'MCA'
      
      const newStudentObj = {
        id: maxId + i + 1,
        name: r.name,
        phone: r.phone || '+91 98123 00000',
        password: `${firstName}@${batch}`,
        email: `${emailName}@gmail.com`,
        joiningMonth: currentMonthYear,
        avatar: '/student_avatar.png',
        batch: batch,
        rollNumber: generatedRoll,
        aiUsed: 0,
        aiTotal: 150,
        address: '',
        learnerCode: '',
        learner_code: '',
        admissionDate: todayStr,
        admission_date: todayStr,
        oscitUserId: '',
        oscit_user_id: '',
        oscitPassword: '',
        oscit_password: '',
      }
      tempStudents.push(newStudentObj)
      return newStudentObj
    })
    setStudents([...students, ...newStudents])
    setOcrResults(null)
    setShowOcrModal(false)
  }

  const handleOcrUpload = () => {
    setOcrProcessing(true)
    setTimeout(() => {
      const simulatedResults = [
        { name: 'Rahul Desai', phone: '+91 98123 45678' },
        { name: 'Kavita Iyer', phone: '+91 98123 45679' },
        { name: 'Amit Saxena', phone: '+91 98123 45680' },
      ]
      setOcrResults(simulatedResults)
      setOcrProcessing(false)
    }, 1200)
  }

  const handleRechargeCredits = (studentId) => {
    setStudents(prev => prev.map(s => {
      if (s && s.id === studentId) {
        const updated = { ...s, aiTotal: (s.aiTotal || 150) + 50 }
        if (activeProfileStudent && activeProfileStudent.id === studentId) {
          setActiveProfileStudent(updated)
        }
        return updated
      }
      return s
    }))
  }

  const togglePasswordVisibility = (id) => {
    setShowPlainPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const getAiStatus = (s) => {
    if (!s) return { label: 'Available', status: 'success' }
    const used = s.aiUsed || 0
    const total = s.aiTotal || 150
    const pct = (used / total) * 100
    if (pct >= 100) return { label: 'Exhausted', status: 'error' }
    if (pct >= 80) return { label: 'Low Balance', status: 'warning' }
    return { label: 'Available', status: 'success' }
  }

  return (
    <div className="animate-fadeIn" style={{ position: 'relative' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            {students.length} REGISTERED STUDENTS ACROSS ALL BATCHES
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setShowOcrModal(true)}>
            📸 OCR INGEST
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            + ADD STUDENT
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          placeholder="🔍 SEARCH BY NAME, ROLL, BATCH, LEARNER CODE, OR OSCIT ID..."
          style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {selectedBatchFilter && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'var(--brand-primary)'
          }}>
            <span>FILTER: BATCH <strong>{selectedBatchFilter}</strong></span>
            <button
              onClick={() => setSelectedBatchFilter('')}
              style={{
                background: 'none', border: 'none', color: 'var(--brand-primary)',
                cursor: 'pointer', fontWeight: 'bold', marginLeft: '4px'
              }}
            >
              ✕ CLEAR
            </button>
          </div>
        )}
      </div>

      {/* Student Registry Table */}
      <div className="glass-card" style={{ padding: 0, border: '1px solid var(--border-grid)', background: 'var(--bg-surface)', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Ref</th>
              <th>Student Name</th>
              <th>Roll Number</th>
              <th>Batch</th>
              <th>Learner Code</th>
              <th>Admission Date</th>
              <th>OSCIT User ID / Password</th>
              <th>Address</th>
              <th>Phone Number</th>
              <th>Password Credential</th>
              <th>AI Tokens</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s) => {
                if (!s) return null
                const aiInfo = getAiStatus(s)
                const safeName = s.name || 'Student Name'
                const initials = safeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const pwd = s.password || s.phone || 'MCA@123'
                const isPlain = showPlainPasswordMap[s.id]

                const learnerVal = s.learnerCode || s.learner_code || '-'
                const admDateVal = s.admissionDate || s.admission_date || '-'
                const oscitUserVal = s.oscitUserId || s.oscit_user_id || '-'
                const oscitPwdVal = s.oscitPassword || s.oscit_password || '-'
                const addressVal = s.address || '-'

                return (
                  <tr key={s.id} onClick={() => setActiveProfileStudent(s)} title="Click to view student profile" style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="avatar-placeholder" style={{ background: 'var(--brand-gradient)', color: '#fff', fontWeight: 700 }}>
                        {initials}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{safeName}</td>
                    <td className="monospace-data" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {s.rollNumber || 'MCA-001'}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--brand-primary)' }}>
                        {s.batch || 'OSCIT_12PM'}
                      </span>
                    </td>
                    <td className="monospace-data" style={{ color: learnerVal !== '-' ? '#38BDF8' : 'var(--text-muted)' }}>
                      {learnerVal}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {admDateVal}
                    </td>
                    <td>
                      {oscitUserVal !== '-' ? (
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          <span style={{ color: '#10B981', fontWeight: 600 }}>{oscitUserVal}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                          <span style={{ color: '#C084FC' }}>{oscitPwdVal}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Not set</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addressVal}>
                      {addressVal}
                    </td>
                    <td className="monospace-data">{s.phone || 'Not provided'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <span className="monospace-data" style={{ color: 'var(--text-secondary)' }}>
                          {isPlain ? pwd : '••••••••'}
                        </span>
                        <button
                          style={{
                            background: 'none', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '0.9rem', padding: '2px 4px'
                          }}
                          onClick={() => togglePasswordVisibility(s.id)}
                          title={isPlain ? "Hide Password" : "Show Password"}
                        >
                          {isPlain ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '60px', height: '5px',
                          backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(((s.aiUsed || 0) / (s.aiTotal || 150)) * 100, 100)}%`, height: '100%',
                            backgroundColor: (s.aiUsed || 0) >= (s.aiTotal || 150) ? 'var(--accent-rose)' :
                              (s.aiUsed || 0) >= (s.aiTotal || 150) * 0.8 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {s.aiUsed || 0}/{s.aiTotal || 150}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-indicator ${aiInfo.status}`}>
                        {aiInfo.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  NO STUDENTS FOUND IN THIS SELECTION
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Student Profile Drawer / Slide-Over Panel */}
      {activeProfileStudent && (
        <>
          <div className="profile-drawer-backdrop" onClick={() => setActiveProfileStudent(null)} />
          <div className="profile-drawer" style={{ overflowY: 'auto' }}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar-placeholder" style={{ width: '42px', height: '42px', fontSize: '1.1rem', background: 'var(--brand-gradient)', color: '#fff', fontWeight: 700, borderRadius: '8px' }}>
                  {(activeProfileStudent.name || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#E2E8F0', fontWeight: 800 }}>
                    {activeProfileStudent.name || 'STUDENT NAME'}
                  </h3>
                  <span className="monospace-data" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 700 }}>
                    {activeProfileStudent.rollNumber || 'MCA-001'}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveProfileStudent(null)}>✕</button>
            </div>

            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
              {/* Extra Details Card: Learner Code, Admission Date, Address */}
              <div className="drawer-card">
                <div className="drawer-card-title" style={{ color: '#38BDF8' }}>ACADEMY ADMISSION & LEARNER DETAILS</div>
                <div className="drawer-row">
                  <span className="drawer-label">Learner Code:</span>
                  <span className="monospace-data" style={{ color: '#38BDF8', fontWeight: 700 }}>
                    {activeProfileStudent.learnerCode || activeProfileStudent.learner_code || 'Not set'}
                  </span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Admission Date:</span>
                  <span>{activeProfileStudent.admissionDate || activeProfileStudent.admission_date || 'Not set'}</span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Residential Address:</span>
                  <span style={{ color: '#E2E8F0' }}>{activeProfileStudent.address || 'Not provided'}</span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Class Code:</span>
                  <span className="monospace-data" style={{ color: '#6366F1', fontWeight: 700 }}>{activeProfileStudent.batch || 'OSCIT_12PM'}</span>
                </div>
              </div>

              {/* OSCIT Credential Card */}
              <div className="drawer-card">
                <div className="drawer-card-title" style={{ color: '#10B981' }}>OSCIT PORTAL CREDENTIALS</div>
                <div className="drawer-row">
                  <span className="drawer-label">OSCIT User ID:</span>
                  <span className="monospace-data" style={{ color: '#10B981', fontWeight: 700 }}>
                    {activeProfileStudent.oscitUserId || activeProfileStudent.oscit_user_id || 'Not set'}
                  </span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">OSCIT Password:</span>
                  <span className="monospace-data" style={{ color: '#C084FC', fontWeight: 700 }}>
                    {activeProfileStudent.oscitPassword || activeProfileStudent.oscit_password || 'Not set'}
                  </span>
                </div>
              </div>

              {/* Account Identity & Credentials */}
              <div className="drawer-card">
                <div className="drawer-card-title" style={{ color: '#38BDF8' }}>ACCOUNT IDENTITY & CREDENTIAL BINDING</div>
                <div className="drawer-row">
                  <span className="drawer-label">Binded Email:</span>
                  <span className="monospace-data" style={{ color: '#E2E8F0', wordBreak: 'break-all' }}>{activeProfileStudent.email || 'Not binded'}</span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Month of Joining:</span>
                  <span>{activeProfileStudent.joiningMonth || 'July 2026'}</span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Phone Number:</span>
                  <span className="monospace-data">{activeProfileStudent.phone || 'Not provided'}</span>
                </div>
                <div className="drawer-row">
                  <span className="drawer-label">Login Password:</span>
                  <span className="monospace-data" style={{ color: '#6366F1', fontWeight: 700 }}>
                    {activeProfileStudent.password || activeProfileStudent.phone || 'MCA@123'}
                  </span>
                </div>
              </div>

              {/* AI Token Ledger Pool */}
              <div className="drawer-card">
                <div className="drawer-card-title" style={{ color: '#F43F5E' }}>AI TOKEN LEDGER POOL</div>
                <div className="drawer-row">
                  <span className="drawer-label">Usage Summary:</span>
                  <span className="monospace-data" style={{ fontWeight: 700 }}>
                    {activeProfileStudent.aiUsed || 0} / {activeProfileStudent.aiTotal || 150} Credits
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', margin: '8px 0 12px' }}>
                  <div style={{
                    width: `${Math.min(((activeProfileStudent.aiUsed || 0) / (activeProfileStudent.aiTotal || 150)) * 100, 100)}%`, height: '100%',
                    backgroundColor: (activeProfileStudent.aiUsed || 0) >= (activeProfileStudent.aiTotal || 150) ? '#F43F5E' :
                      (activeProfileStudent.aiUsed || 0) >= (activeProfileStudent.aiTotal || 150) * 0.8 ? '#F59E0B' : '#10B981',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`status-indicator ${getAiStatus(activeProfileStudent).status}`} style={{ fontWeight: 700 }}>
                    {getAiStatus(activeProfileStudent).label}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    onClick={() => handleRechargeCredits(activeProfileStudent.id)}
                  >
                    ⚡ Recharge +50 Credits
                  </button>
                </div>
              </div>

              {/* Attendance Calendar */}
              <div className="drawer-card">
                <div className="drawer-card-title" style={{ color: '#10B981' }}>
                  ATTENDANCE CALENDAR (SINCE {(activeProfileStudent.joiningMonth || 'July 2026').toUpperCase()})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {generateDetailedHistory(activeProfileStudent.joiningMonth, activeProfileStudent.name).map((cell, i) => (
                    <div
                      key={i}
                      className={`contrib-cell ${cell.present ? 'level-4' : 'level-0'}`}
                      title={`${cell.date}: ${cell.present ? 'Present' : 'Absent'}`}
                      style={{ width: '12px', height: '12px', borderRadius: '2px' }}
                    />
                  ))}
                </div>
                <div className="contrib-legend" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  <div className="contrib-cell level-0" style={{ width: '8px', height: '8px', borderRadius: '1px' }} /> Absent
                  <div style={{ width: '16px' }} />
                  <div className="contrib-cell level-4" style={{ width: '8px', height: '8px', borderRadius: '1px' }} /> Present
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-secondary" onClick={() => openEditModal(activeProfileStudent)}>✏️ EDIT PROFILE</button>
              <button className="btn btn-primary" onClick={() => setActiveProfileStudent(null)}>CLOSE PROFILE</button>
            </div>
          </div>
        </>
      )}

      {/* Manual Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Create Student Profile</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Sweety Das"
                  value={newStudent.name}
                  onChange={(e) => handleAddNameChange(e.target.value)}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. +91 98123 45678"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Login Password *</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="Credential Password"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Assign to Batch</label>
                  <select
                    className="form-input"
                    value={newStudent.batch}
                    onChange={(e) => handleAddBatchChange(e.target.value)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)', color: 'var(--text-main)' }}
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.code}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Calculated Roll Number</label>
                  <input
                    className="form-input monospace-data"
                    value={newStudent.rollNumber}
                    readOnly
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--accent-cyan)', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {/* 5 NEW FIELDS: Learner Code & Admission Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Learner Code (OSCIT)</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="e.g. LRN-88912 (Leave blank if pending)"
                    value={newStudent.learnerCode}
                    onChange={(e) => setNewStudent({ ...newStudent, learnerCode: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Admission Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newStudent.admissionDate}
                    onChange={(e) => setNewStudent({ ...newStudent, admissionDate: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
              </div>

              {/* 5 NEW FIELDS: OSCIT User ID & OSCIT Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">OSCIT Portal User ID</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="e.g. oscit_sweety"
                    value={newStudent.oscitUserId}
                    onChange={(e) => setNewStudent({ ...newStudent, oscitUserId: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">OSCIT Portal Password</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="e.g. OscitPass@2026"
                    value={newStudent.oscitPassword}
                    onChange={(e) => setNewStudent({ ...newStudent, oscitPassword: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
              </div>

              {/* 5 NEW FIELDS: Address */}
              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <input
                  className="form-input"
                  placeholder="e.g. At/PO Cuttack, Dist-Cuttack, Odisha"
                  value={newStudent.address}
                  onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student Gmail Account (Auto-Generated)</label>
                <input
                  className="form-input monospace-data"
                  value={newStudent.email}
                  readOnly
                  style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.8 }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleManualAdd}>Confirm Enrollment</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Edit Student Profile & OSCIT Credentials</h3>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={editingStudent.name}
                  onChange={(e) => handleEditNameChange(e.target.value)}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    className="form-input"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Login Password *</label>
                  <input
                    className="form-input monospace-data"
                    value={editingStudent.password}
                    onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Assign to Batch</label>
                  <select
                    className="form-input"
                    value={editingStudent.batch}
                    onChange={(e) => handleEditBatchChange(e.target.value)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)', color: 'var(--text-main)' }}
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.code}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    className="form-input monospace-data"
                    value={editingStudent.rollNumber}
                    onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                    style={{ background: 'var(--bg-input)', color: 'var(--accent-cyan)', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {/* EDIT: Learner Code & Admission Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Learner Code (OSCIT)</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="Learner Code"
                    value={editingStudent.learnerCode}
                    onChange={(e) => setEditingStudent({ ...editingStudent, learnerCode: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Admission Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingStudent.admissionDate}
                    onChange={(e) => setEditingStudent({ ...editingStudent, admissionDate: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
              </div>

              {/* EDIT: OSCIT User ID & OSCIT Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">OSCIT User ID</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="OSCIT Username / ID"
                    value={editingStudent.oscitUserId}
                    onChange={(e) => setEditingStudent({ ...editingStudent, oscitUserId: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">OSCIT Password</label>
                  <input
                    className="form-input monospace-data"
                    placeholder="OSCIT Password"
                    value={editingStudent.oscitPassword}
                    onChange={(e) => setEditingStudent({ ...editingStudent, oscitPassword: e.target.value })}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                  />
                </div>
              </div>

              {/* EDIT: Address */}
              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <input
                  className="form-input"
                  placeholder="Full Address"
                  value={editingStudent.address}
                  onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-grid)' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                className="btn"
                style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#F43F5E', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                onClick={() => handleDeleteStudent(editingStudent.id)}
              >
                🗑️ Delete Student
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR Ingest Modal */}
      {showOcrModal && (
        <div className="modal-overlay" onClick={() => setShowOcrModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3>📸 OCR Roster Import</h3>
              <button className="modal-close-btn" onClick={() => setShowOcrModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {!ocrResults ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', border: '2px dashed var(--border-grid)', borderRadius: '12px' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📄</span>
                  <h4 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Scan Physical Attendance Register</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Upload image of attendance roster to automatically ingest student records.
                  </p>
                  <button className="btn btn-primary" onClick={handleOcrUpload} disabled={ocrProcessing}>
                    {ocrProcessing ? '⌛ Processing Image...' : '📁 Select Roster Image'}
                  </button>
                </div>
              ) : (
                <div>
                  <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 800 }}>
                    PREVIEW DETECTED RECORDS ({ocrResults.length} FOUND)
                  </h4>
                  <table className="data-table" style={{ marginBottom: '16px' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Assigned Roll</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrResults.map((r, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{r.name}</td>
                          <td className="monospace-data">{r.phone}</td>
                          <td className="monospace-data" style={{ color: 'var(--accent-cyan)' }}>
                            {generateRollNumber(selectedBatchFilter || batches[0]?.code || 'OSCIT_12PM', i + 1, students)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOcrModal(false)}>Cancel</button>
              {ocrResults && (
                <button className="btn btn-primary" onClick={handleOcrConfirm}>Confirm Ingestion</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
