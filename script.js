/* =============================================
   SCHOOL MANAGEMENT SYSTEM — COMBINED SCRIPT
   All JavaScript from all HTML files has been moved here.
   A dispatch pattern initializes the correct page.
   ============================================= */

/* =============================================
   STUDENT MONTHLY FEE — SHARED CONFIGURATION
   ============================================= */
var STUDENT_MONTHLY_FEES = {
    '5th':  3000,
    '6th':  4000,
    '7th':  5000,
    '8th':  6000,
    '9th':  7000,
    '10th': 8000,
    '11th': 9000,
    '12th': 10000
};

var STUDENT_FEE_TYPES = [
    { value: 'Full Fees', label: 'Full Fees', percent: 100 },
    { value: 'Half Fees', label: 'Half Fees', percent: 50 },
    { value: 'Free Fees', label: 'Free Fees', percent: 0 }
];

var STUDENT_DEFAULT_FEE_TYPE = 'Full Fees';

function getMonthlyFeeForClass(className) {
    if (!className) return 0;
    var value = STUDENT_MONTHLY_FEES[className];
    return typeof value === 'number' ? value : 0;
}

function normalizeStudentFeeType(feeType) {
    for (var i = 0; i < STUDENT_FEE_TYPES.length; i++) {
        if (STUDENT_FEE_TYPES[i].value === feeType) return STUDENT_FEE_TYPES[i].value;
    }
    return STUDENT_DEFAULT_FEE_TYPE;
}

function getStudentFeeTypePercent(feeType) {
    for (var i = 0; i < STUDENT_FEE_TYPES.length; i++) {
        if (STUDENT_FEE_TYPES[i].value === feeType) return STUDENT_FEE_TYPES[i].percent;
    }
    return 100;
}

function calculateMonthlyFee(className, feeType) {
    var base = getMonthlyFeeForClass(className);
    var percent = getStudentFeeTypePercent(normalizeStudentFeeType(feeType));
    return Math.round(base * percent / 100);
}

function getStudentEffectiveFeeType(student) {
    return normalizeStudentFeeType(student && student.feeType);
}

function getStudentMonthlyFee(student) {
    if (!student) return 0;
    return calculateMonthlyFee(student.className, getStudentEffectiveFeeType(student));
}

/* =============================================
   STUDENT FEE — SHARED STORAGE HELPERS
   ============================================= */
var SF_KEY_STUDENTS = 'studentsData';
var SF_KEY_FEES     = 'feesData';
var SF_KEY_SETTINGS = 'schoolSettings';

function sfReadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed === undefined || parsed === null ? fallback : parsed;
    } catch (e) {
        console.warn('[Fee] Could not read ' + key, e);
        return fallback;
    }
}

function sfWriteJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('[Fee] Could not write ' + key, e);
        return false;
    }
}

function sfLoadStudents() {
    const parsed = sfReadJson(SF_KEY_STUDENTS, []);
    return Array.isArray(parsed) ? parsed : [];
}

function sfLoadFees() {
    const parsed = sfReadJson(SF_KEY_FEES, []);
    return Array.isArray(parsed) ? parsed : [];
}

function sfSaveFees(list) { return sfWriteJson(SF_KEY_FEES, list); }

function sfEscapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sfFormatAmount(n) {
    const num = Number(n) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function sfCurrentMonthKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function sfMonthKeyOfDate(iso) {
    if (!iso) return '';
    const parts = String(iso).split('-');
    return parts.length >= 2 ? parts[0] + '-' + parts[1] : '';
}

function sfMonthLabel(monthKey) {
    const parts = String(monthKey || '').split('-');
    if (parts.length !== 2) return monthKey || '—';
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const idx = parseInt(parts[1], 10) - 1;
    return (names[idx] || parts[1]) + ' ' + parts[0];
}

function sfTodayISO() {
    const d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
}

function sfFormatDisplayDate(iso) {
    if (!iso) return '—';
    const parts = String(iso).split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : iso;
}

function sfNextFeeId(fees) {
    let maxNum = 0;
    fees.forEach(function (f) {
        const m = /^F(\d+)$/.exec(String((f && f.id) || ''));
        if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        }
    });
    return 'F' + String(maxNum + 1).padStart(3, '0');
}

function sfMonthDueDate(monthKey) {
    return String(monthKey || '') + '-10';
}

function sfFindFeeRecord(fees, studentId, monthKey) {
    for (let i = 0; i < fees.length; i++) {
        const f = fees[i];
        if (!f || String(f.studentId) !== String(studentId)) continue;
        const key = f.monthKey || sfMonthKeyOfDate(f.dueDate);
        if (key === monthKey) return f;
    }
    return null;
}

function sfSchoolProfile() {
    const saved = sfReadJson(SF_KEY_SETTINGS, null);
    const name = (saved && typeof saved.schoolName === 'string' && saved.schoolName.trim())
        ? saved.schoolName.trim() : 'School Management System';
    return {
        name: name,
        phone: (saved && saved.schoolPhone) || '',
        email: (saved && saved.schoolEmail) || '',
        address: (saved && saved.schoolAddress) || ''
    };
}

function sfBuildFeeRecord(student, monthKey, fees) {
    const monthly = getStudentMonthlyFee(student);
    return {
        id: sfNextFeeId(fees),
        studentId: student.id,
        studentName: student.name || '',
        className: student.className || '',
        feeType: getStudentEffectiveFeeType(student),
        monthKey: monthKey,
        amount: monthly,
        paidAmount: 0,
        dueDate: sfMonthDueDate(monthKey),
        status: monthly > 0 ? 'Unpaid' : 'Free',
        paymentHistory: [],
        autoGenerated: true
    };
}

function sfSyncStudentFeeRecord(student) {
    if (!student || student.id == null) return null;
    const fees = sfLoadFees();
    const existing = sfFindFeeRecord(fees, student.id, sfCurrentMonthKey());
    if (!existing) return null;

    if ((Number(existing.paidAmount) || 0) > 0) return existing;

    const monthly = getStudentMonthlyFee(student);
    existing.feeType   = getStudentEffectiveFeeType(student);
    existing.className = student.className || existing.className;
    existing.amount    = monthly;
    existing.status    = monthly > 0 ? 'Unpaid' : 'Free';
    sfSaveFees(fees);
    return existing;
}

function sfEnsureFeeRecordForStudent(student) {
    if (!student || student.id == null) return null;
    const fees = sfLoadFees();
    const monthKey = sfCurrentMonthKey();
    const existing = sfFindFeeRecord(fees, student.id, monthKey);
    if (existing) return existing;

    const record = sfBuildFeeRecord(student, monthKey, fees);
    fees.push(record);
    sfSaveFees(fees);
    return record;
}

function sfEnsureMonthlyFeeRecords() {
    const fees = sfLoadFees();
    const students = sfLoadStudents();
    const monthKey = sfCurrentMonthKey();
    let changed = false;

    students.forEach(function (student) {
        if (!student || student.id == null) return;
        if (sfFindFeeRecord(fees, student.id, monthKey)) return;
        fees.push(sfBuildFeeRecord(student, monthKey, fees));
        changed = true;
    });

    if (changed) sfSaveFees(fees);
    return fees;
}

function sfResolveFeeInfo(fee, students) {
    const student = (students || sfLoadStudents()).find(function (s) {
        return String(s.id) === String(fee.studentId);
    }) || null;

    const feeType = getStudentEffectiveFeeType(student || { feeType: fee.feeType });
    const monthly = student ? getStudentMonthlyFee(student) : (Number(fee.amount) || 0);

    return {
        student: student,
        studentName: fee.studentName || (student && student.name) || '—',
        feeType: feeType,
        monthlyFee: monthly,
        paidAmount: Number(fee.paidAmount) || 0,
        remaining: Math.max(0, monthly - (Number(fee.paidAmount) || 0))
    };
}

/* =============================================
   STUDENT FEE CARD / RECEIPT (shared, printable)
   ============================================= */
function sfFeeCardModalHtml() {
    return '' +
    '<div class="modal-overlay" id="studentFeeCardModal" role="dialog" aria-modal="true" aria-labelledby="studentFeeCardTitle">' +
        '<div class="modal fee-card-modal">' +
            '<div class="modal-header">' +
                '<h2 id="studentFeeCardTitle"><i class="fas fa-money-check-dollar"></i> Student Fee Card</h2>' +
                '<button type="button" class="modal-close" id="studentFeeCardClose" aria-label="Close"><i class="fas fa-times"></i></button>' +
            '</div>' +
            '<div class="modal-body">' +
                '<div class="fee-print-area" id="studentFeeCardArea"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
                '<button type="button" class="btn-secondary" id="studentFeeCardCloseBtn">Close</button>' +
                '<button type="button" class="btn-primary" id="printStudentFeeCardBtn">' +
                    '<i class="fas fa-print"></i> Print Fee Card' +
                '</button>' +
            '</div>' +
        '</div>' +
    '</div>';
}

function sfEnsureFeeCardModal() {
    let modal = document.getElementById('studentFeeCardModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', sfFeeCardModalHtml());
        modal = document.getElementById('studentFeeCardModal');
    }
    if (!modal) return null;

    if (modal.dataset.sfBound === '1') return modal;
    modal.dataset.sfBound = '1';

    const close = function () {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    };

    const closeBtn = document.getElementById('studentFeeCardClose');
    const closeFooterBtn = document.getElementById('studentFeeCardCloseBtn');
    const printBtn = document.getElementById('printStudentFeeCardBtn');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) close();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
    if (printBtn) printBtn.addEventListener('click', sfPrintStudentFeeCard);

    return modal;
}

function sfOpenStudentFeeCard(studentId) {
    const students = sfLoadStudents();
    const student = students.find(function (s) { return String(s.id) === String(studentId); });
    if (!student) return false;

    const fee = sfEnsureFeeRecordForStudent(student);
    const modal = sfEnsureFeeCardModal();
    const area = document.getElementById('studentFeeCardArea');
    if (!modal || !area) return false;

    const monthly = fee && fee.amount != null ? (Number(fee.amount) || 0) : getStudentMonthlyFee(student);
    const paid = fee ? (Number(fee.paidAmount) || 0) : 0;
    const remaining = Math.max(0, monthly - paid);
    const feeType = (fee && fee.feeType) ? normalizeStudentFeeType(fee.feeType)
                                         : getStudentEffectiveFeeType(student);
    const monthKey = fee ? (fee.monthKey || sfMonthKeyOfDate(fee.dueDate)) : sfCurrentMonthKey();
    const school = sfSchoolProfile();
    const typeInfo = STUDENT_FEE_TYPES.find(function (t) { return t.value === feeType; }) || STUDENT_FEE_TYPES[0];
    const history = (fee && Array.isArray(fee.paymentHistory)) ? fee.paymentHistory : [];

    const statusLabel = monthly === 0 ? 'Free' : (remaining === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Unpaid'));
    const statusClass = statusLabel.toLowerCase().replace(/\s+/g, '-');

    let paymentsHtml;
    if (history.length === 0) {
        paymentsHtml = '<div class="fee-card-no-payments">No payments recorded yet.</div>';
    } else {
        paymentsHtml = '<table class="fee-card-table">' +
            '<thead><tr><th>Date</th><th class="right">Amount Paid (PKR)</th></tr></thead><tbody>' +
            history.map(function (h) {
                return '<tr><td>' + sfEscapeHtml(sfFormatDisplayDate(h.date)) + '</td>' +
                       '<td class="right">' + sfFormatAmount(h.amount) + '</td></tr>';
            }).join('') +
            '</tbody></table>';
    }

    const schoolMeta = [school.phone, school.email, school.address].filter(Boolean).join(' · ');

    area.innerHTML = '' +
        '<div class="fee-card">' +
            '<div class="fee-card-head">' +
                '<div class="fee-card-brand">' +
                    '<div class="fee-card-logo"><i class="fas fa-graduation-cap"></i></div>' +
                    '<div class="fee-card-brand-text">' +
                        '<div class="fee-card-school">' + sfEscapeHtml(school.name) + '</div>' +
                        '<div class="fee-card-tagline">Student Fee Card / Monthly Fee Receipt</div>' +
                    '</div>' +
                '</div>' +
                '<div class="fee-card-month">' +
                    '<span class="fee-card-month-label">Fee Month</span>' +
                    '<span class="fee-card-month-value">' + sfEscapeHtml(sfMonthLabel(monthKey)) + '</span>' +
                '</div>' +
            '</div>' +

            '<div class="fee-card-grid">' +
                '<div class="fee-card-item"><span class="fee-card-label">Student Name</span>' +
                    '<span class="fee-card-value">' + sfEscapeHtml(student.name || '—') + '</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Student ID</span>' +
                    '<span class="fee-card-value">' + sfEscapeHtml(student.id) + '</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Class</span>' +
                    '<span class="fee-card-value">' + sfEscapeHtml(student.className || '—') + '</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Fee Type</span>' +
                    '<span class="fee-card-value">' + sfEscapeHtml(typeInfo.label) + ' (' + typeInfo.percent + '%)</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Monthly Fee</span>' +
                    '<span class="fee-card-value amount">PKR ' + sfFormatAmount(monthly) + '</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Paid Amount</span>' +
                    '<span class="fee-card-value amount">PKR ' + sfFormatAmount(paid) + '</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Remaining Balance</span>' +
                    '<span class="fee-card-value amount due">PKR ' + sfFormatAmount(remaining) + '</span></div>' +
                '<div class="fee-card-item"><span class="fee-card-label">Payment Status</span>' +
                    '<span class="fee-card-value"><span class="status-pill ' + statusClass + '">' + statusLabel + '</span></span></div>' +
            '</div>' +

            '<div class="fee-card-section-title"><i class="fas fa-receipt"></i> Payment Details</div>' +
            paymentsHtml +

            '<div class="fee-card-foot">' +
                '<span>Issued: ' + sfEscapeHtml(sfFormatDisplayDate(sfTodayISO())) + '</span>' +
                '<span>' + sfEscapeHtml(schoolMeta || school.name) + '</span>' +
            '</div>' +
        '</div>';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    return true;
}

/* =============================================
   PRINT STUDENT FEE CARD
   Copies the populated Fee Card into a dedicated
   print wrapper, then prints. The @media print
   rules in style.css hide everything else on the
   page, so ONLY the Fee Card appears in the
   print preview / printed output.
   ============================================= */
function sfPrintStudentFeeCard() {
    const area = document.getElementById('studentFeeCardArea');
    if (!area || !area.innerHTML.trim()) return;

    let wrapper = document.getElementById('feeCardPrintWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'feeCardPrintWrapper';
        wrapper.className = 'fee-card-print-wrapper';
        wrapper.setAttribute('aria-hidden', 'true');
        document.body.appendChild(wrapper);
    }

    wrapper.innerHTML = area.innerHTML;
    document.body.classList.add('sf-printing-fee-card');

    const cleanup = function () {
        document.body.classList.remove('sf-printing-fee-card');
        wrapper.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
}


(function() {
    'use strict';

    /* ============ CONFIG ============ */
    const VALID_EMAIL = 'Tabsap123@gmail.com';
    const VALID_PASSWORD = 'Tabsap123';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const STORAGE_KEY_REMEMBER = 'rememberMe';
    const STORAGE_KEY_PROFILE_IMAGE = 'adminProfileImage';

    const LOGIN_PAGE_URL = 'index.html';
    const DASHBOARD_URL = 'dashboard.html';

    /* ============ STORAGE HELPERS ============ */
    function removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) { /* ignore */ }
    }

    function clearAllAuthStorage() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            localStorage.removeItem(STORAGE_KEY_REMEMBER);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            removeFromStorage('adminProfileImage');
            removeFromStorage('adminDisplayName');
        } catch (e) { /* ignore */ }
    }

    /* ============ TRANSIENT HINT ============ */
    let hintTimer = null;
    let hintElement = null;

    function showTransientHint(message, type) {
        if (!hintElement) {
            hintElement = document.createElement('div');
            hintElement.style.cssText =
                'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
                'background:#1e3a5f;color:#fff;padding:0.7rem 1.1rem;border-radius:40px;' +
                'font-size:0.85rem;font-weight:500;box-shadow:0 10px 24px -8px rgba(0,0,0,0.35);' +
                'z-index:200;opacity:0;transition:opacity 0.25s ease;pointer-events:none;' +
                'max-width:90vw;text-align:center;';
            document.body.appendChild(hintElement);
        }

        hintElement.textContent = message;
        if (type === 'success') hintElement.style.background = '#15803d';
        else if (type === 'error') hintElement.style.background = '#b91c1c';
        else hintElement.style.background = '#1e3a5f';

        void hintElement.offsetWidth;
        hintElement.style.opacity = '1';

        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(function() {
            hintElement.style.opacity = '0';
        }, 2200);
    }

    function hideError() {
        const err = document.getElementById('loginError');
        if (err) err.classList.remove('visible');
    }

    /* ============ PROFILE: LOAD SAVED DATA ============ */
    function loadProfileData() {
        let email = null;
        let profileImage = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            profileImage = localStorage.getItem(STORAGE_KEY_PROFILE_IMAGE);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName = (savedName && savedName.trim()) || fallbackName;

        const adminAvatar = document.getElementById('adminAvatar');
        const adminName = document.getElementById('adminName');

        if (adminAvatar && adminName) {
            if (profileImage) {
                adminAvatar.innerHTML = '<img src="' + profileImage + '" alt="Profile">';
                adminName.textContent = displayName;
            } else if (email) {
                const initial = email.trim().charAt(0).toUpperCase() || 'A';
                adminAvatar.innerHTML = '<span>' + initial + '</span>';
                adminName.textContent = displayName;
            } else {
                adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
                adminName.textContent = displayName;
            }
        }
        const pdEmail = document.getElementById('pdEmail');
        if (pdEmail) {
            pdEmail.textContent = email ? email : '—';
        }
        const pdName = document.getElementById('pdName');
        if (pdName) {
            pdName.textContent = displayName;
        }
    }

    /* ============ PROFILE IMAGE: ONE SHARED SOURCE ============ */
    function getSharedProfileImage() {
        try {
            return localStorage.getItem(STORAGE_KEY_PROFILE_IMAGE);
        } catch (e) {
            return null;
        }
    }

    function buildFallbackAvatarMarkup() {
        let email = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            return '<span>' + initial + '</span>';
        }
        return '<i class="fas fa-user"></i>';
    }

    function applySharedProfileImage() {
        const profileImage = getSharedProfileImage();

        ['#adminAvatar', '#profileDropdownAvatar'].forEach(function (selector) {
            const el = document.querySelector(selector);
            if (!el) return;

            const img = el.querySelector('img');

            if (profileImage) {
                if (img && img.getAttribute('src') === profileImage) return;
                el.innerHTML = '<img src="' + profileImage + '" alt="Profile">';
            } else if (img) {
                el.innerHTML = buildFallbackAvatarMarkup();
            }
        });
    }

    window.getSharedProfileImage = getSharedProfileImage;
    window.applySharedProfileImage = applySharedProfileImage;

    /* ============ SCHOOL LOGO ============ */
    function getSharedSchoolLogo() {
        try {
            const raw = localStorage.getItem('schoolSettings');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed.schoolLogo === 'string') ? parsed.schoolLogo : null;
        } catch (e) {
            return null;
        }
    }

    function applySharedSchoolLogo() {
        const logo = getSharedSchoolLogo();
        document.querySelectorAll('.header-brand .brand-icon').forEach(function (el) {
            const img = el.querySelector('img');
            if (logo) {
                if (img && img.getAttribute('src') === logo) return;
                el.innerHTML = '<img src="' + logo + '" alt="School logo">';
            } else if (img) {
                el.innerHTML = '<i class="fas fa-graduation-cap"></i>';
            }
        });
        document.querySelectorAll('.logo-wrapper').forEach(function (wrap) {
            const img = wrap.querySelector('img');
            const fallback = wrap.querySelector('.logo-fallback');
            if (logo) {
                if (img) {
                    if (img.getAttribute('src') !== logo) img.setAttribute('src', logo);
                } else {
                    wrap.insertAdjacentHTML('afterbegin', '<img src="' + logo + '" alt="School logo">');
                }
                if (fallback) fallback.style.display = 'none';
            } else {
                if (img) img.remove();
                if (fallback) fallback.style.display = '';
            }
        });
    }

    window.getSharedSchoolLogo = getSharedSchoolLogo;
    window.applySharedSchoolLogo = applySharedSchoolLogo;

    /* ============ THEME TOGGLE ============ */
    function createThemeToggle(savedTheme) {
        const existingBtn = document.getElementById('themeToggleBtn');
        if (existingBtn) {
            existingBtn.remove();
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'themeToggleBtn';
        btn.className = 'theme-switch';
        btn.setAttribute('role', 'switch');
        btn.setAttribute('aria-checked', savedTheme === 'dark' ? 'true' : 'false');
        btn.setAttribute('aria-label', savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        btn.title = savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

        btn.innerHTML =
            '<span class="theme-switch-track" aria-hidden="true">' +
                '<span class="theme-switch-side ts-light">' +
                    '<i class="fas fa-sun"></i>' +
                '</span>' +
                '<span class="theme-switch-side ts-dark">' +
                    '<i class="fas fa-moon"></i>' +
                    '<i class="fas fa-star ts-star ts-star-1"></i>' +
                    '<i class="fas fa-star ts-star ts-star-2"></i>' +
                    '<i class="fas fa-star ts-star ts-star-3"></i>' +
                '</span>' +
                '<span class="theme-switch-thumb">' +
                    '<span class="theme-switch-thumb-gloss"></span>' +
                '</span>' +
            '</span>';

        btn.addEventListener('click', function () {
            const htmlEl = document.documentElement;
            if (htmlEl.getAttribute('data-theme') === 'dark') {
                htmlEl.removeAttribute('data-theme');
                localStorage.setItem('appTheme', 'light');
                btn.setAttribute('aria-checked', 'false');
                btn.setAttribute('aria-label', 'Switch to dark mode');
                btn.title = 'Switch to dark mode';
            } else {
                htmlEl.setAttribute('data-theme', 'dark');
                localStorage.setItem('appTheme', 'dark');
                btn.setAttribute('aria-checked', 'true');
                btn.setAttribute('aria-label', 'Switch to light mode');
                btn.title = 'Switch to light mode';
            }
        });

        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const notificationBtn = headerActions.querySelector('#notificationBtn');
            const adminProfile = headerActions.querySelector('.admin-profile');
            if (notificationBtn && adminProfile) {
                headerActions.insertBefore(btn, adminProfile);
            } else if (notificationBtn) {
                headerActions.appendChild(btn);
            } else if (adminProfile) {
                headerActions.insertBefore(btn, adminProfile);
            } else {
                headerActions.appendChild(btn);
            }
        }
    }

    /* ============ AUTH: LOGIN PAGE ============ */
    function initLoginPage() {
        const form = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const rememberCheckbox = document.getElementById('rememberMe');
        const errorContainer = document.getElementById('loginError');
        const errorText = document.getElementById('errorText');
        const forgotBtn = document.getElementById('forgotPasswordBtn');

        try {
            const remembered = localStorage.getItem(STORAGE_KEY_REMEMBER);
            if (remembered === 'true') {
                rememberCheckbox.checked = true;
                const savedEmail = localStorage.getItem(STORAGE_KEY_USER_EMAIL);
                if (savedEmail) {
                    emailInput.value = savedEmail;
                }
            }
        } catch (e) { /* ignore */ }

        function handleLogin(event) {
            event.preventDefault();

            hideError();

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const remember = rememberCheckbox.checked;

            if (!email) {
                showError('Please enter your email.');
                emailInput.focus();
                return;
            }

            if (!password) {
                showError('Please enter your password.');
                passwordInput.focus();
                return;
            }

            if (email !== VALID_EMAIL || password !== VALID_PASSWORD) {
                showError('Invalid email or password.');
                passwordInput.value = '';
                passwordInput.focus();
                return;
            }

            try {
                if (remember) {
                    localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
                } else {
                    localStorage.removeItem(STORAGE_KEY_REMEMBER);
                }
            } catch (e) { /* ignore */ }

            try {
                if (remember) {
                    localStorage.setItem(STORAGE_KEY_LOGGED_IN, 'true');
                    localStorage.setItem(STORAGE_KEY_USER_EMAIL, email);
                    sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
                } else {
                    sessionStorage.setItem(STORAGE_KEY_LOGGED_IN, 'true');
                    sessionStorage.setItem(STORAGE_KEY_USER_EMAIL, email);
                    localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
                    localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
                }
            } catch (e) { /* ignore */ }

            window.location.href = DASHBOARD_URL;
        }

        function showError(message) {
            errorText.textContent = message || 'Invalid email or password.';
            errorContainer.classList.add('visible');
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        emailInput.addEventListener('input', hideError);
        passwordInput.addEventListener('input', hideError);

        if (form) {
            form.addEventListener('submit', handleLogin);
        }

        if (forgotBtn) {
            forgotBtn.addEventListener('click', function() {
                showError('Password reset link would be sent to your email (demo).');
                setTimeout(() => {
                    if (errorText.textContent.includes('Password reset link')) {
                        hideError();
                    }
                }, 4000);
            });
        }
    }

    /* ============ AUTH: PROTECT PAGE ============ */
    function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            window.sessionStorage ? sessionStorage.setItem('__redirect_pending', '1') : null;
            window.location.href = LOGIN_PAGE_URL;
        } else {
            console.log('[Auth] Protected page access granted.');
        }
    }

    /* ============ AUTH: LOGOUT ============ */
    function handleLogout() {
        clearAllAuthStorage();
        window.sessionStorage ? sessionStorage.setItem('__just_logged_out', '1') : null;
        window.location.href = LOGIN_PAGE_URL;
    }

    /* ============ NAVIGATION: SIDEBAR MOBILE ============ */
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');

        if (!sidebar || !mobileMenuBtn) return;

        // ✅ HAMBURGER FIX #1 — guard against double-binding when
        // initSidebar() is called more than once (e.g. by page scripts).
        if (mobileMenuBtn.dataset.sidebarBound === '1') return;
        mobileMenuBtn.dataset.sidebarBound = '1';

        sidebar.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('show');

        // ✅ HAMBURGER FIX #2 — swap the icon between (☰) bars and (X) close
        // and keep ARIA state in sync.
        function setMenuIcon(isOpen) {
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isOpen);
                icon.classList.toggle('fa-xmark', isOpen);
            }
            mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        function openSidebar() {
            sidebar.classList.add('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.add('show');
            setMenuIcon(true);
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            if (sidebarBackdrop) sidebarBackdrop.classList.remove('show');
            setMenuIcon(false);
        }

        mobileMenuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (sidebar.classList.contains('open')) closeSidebar();
            else openSidebar();
        });

        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', closeSidebar);
        }

        window.addEventListener('resize', function () {
            if (window.innerWidth > 900) closeSidebar();
        });

        // Ensure the icon reflects the initial (closed) state on page load.
        setMenuIcon(sidebar.classList.contains('open'));
    }

    /* ============ NAVIGATION: SIDEBAR CLICK ============ */
    function initSidebarNavigation() {
        const sidebar = document.getElementById('sidebar');
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        if (!sidebar || sidebarLinks.length === 0) return;

        sidebarLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                const parentLi = link.parentElement;
                document.querySelectorAll('.sidebar-menu li').forEach(function(li) {
                    li.classList.remove('active');
                });
                parentLi.classList.add('active');

                showTransientHint('This page is not implemented in the demo yet.');

                const backdrop = document.getElementById('sidebarBackdrop');
                if (backdrop && sidebar.classList.contains('open')) {
                    backdrop.click();
                }
            });
        });
    }

    /* ============ LOGOUT: SIDEBAR + PROFILE DROPDOWN ============ */
    function initLogoutHandlers() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                handleLogout();
            });
        }

        const pdLogout = document.getElementById('pdLogout');
        if (pdLogout) {
            pdLogout.addEventListener('click', function(e) {
                e.stopPropagation();
                handleLogout();
            });
        }

        const pdLogin = document.getElementById('pdLogin');
        if (pdLogin) {
            pdLogin.addEventListener('click', function(e) {
                e.stopPropagation();
                window.location.href = LOGIN_PAGE_URL;
            });
        }
    }

    /* ============ PAGE DISPATCH ============ */
    function getCurrentPage() {
        try {
            return window.location.pathname.split('/').pop() || 'index.html';
        } catch (e) {
            return 'index.html';
        }
    }

    function init() {
        const page = getCurrentPage();

        let justLoggedOut = false;
        try {
            justLoggedOut = sessionStorage.getItem('__just_logged_out') === '1';
            if (justLoggedOut) sessionStorage.removeItem('__just_logged_out');
        } catch (e) { /* ignore */ }

        hideError();

        loadProfileData();

        let savedTheme = localStorage.getItem('appTheme');
        if (savedTheme !== 'dark') {
            savedTheme = 'light';
        }
        const htmlEl = document.documentElement;
        if (savedTheme === 'dark') {
            htmlEl.setAttribute('data-theme', 'dark');
        } else {
            htmlEl.removeAttribute('data-theme');
        }
        createThemeToggle(savedTheme);

        try {
            const appearanceRaw = localStorage.getItem('settingsAppearance');
            if (appearanceRaw) {
                const appearance = JSON.parse(appearanceRaw);
                if (appearance && /^#[0-9a-fA-F]{6}$/.test(appearance.primaryColor || '')) {
                    const hex = appearance.primaryColor;
                    const num = parseInt(hex.slice(1), 16);
                    const amt = Math.round(2.55 * -12);
                    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
                    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
                    const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
                    const hover = '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
                    htmlEl.style.setProperty('--accent', hex);
                    htmlEl.style.setProperty('--accent-hover', hover);
                }
                if (appearance && appearance.sidebarMode === 'collapsed') {
                    document.body.classList.add('sidebar-collapsed');
                }
            }
        } catch (e) { /* ignore */ }

        try {
            const isLoggedIn = (localStorage.getItem('isLoggedIn') === 'true')
                || (sessionStorage.getItem('isLoggedIn') === 'true');
            const pdLogin = document.getElementById('pdLogin');
            const pdLogout = document.getElementById('pdLogout');
            if (pdLogin && pdLogout) {
                if (isLoggedIn) {
                    pdLogin.classList.add('d-none');
                    pdLogout.classList.remove('d-none');
                } else {
                    pdLogin.classList.remove('d-none');
                    pdLogout.classList.add('d-none');
                }
            }
        } catch (e) { /* ignore */ }

        const adminAvatar = document.getElementById('adminAvatar');
        const adminProfileFileInput = document.getElementById('adminProfileFileInput');
        if (adminAvatar && adminProfileFileInput) {
            adminAvatar.addEventListener('click', function (e) {
                const isImageClick = e.target.tagName === 'IMG' || e.target.parentElement.tagName === 'IMG';

                if (isImageClick) {
                    adminProfileFileInput.click();
                    return;
                }

                const isIconClick =
                    e.target.tagName === 'I' || (e.target.parentElement && e.target.parentElement.tagName === 'I');

                if (isIconClick) {
                    const profileDropdown = document.getElementById('profileDropdown');
                    if (profileDropdown) {
                        const profileDropdownAvatar = document.getElementById('profileDropdownAvatar');
                        if (profileDropdown.classList.contains('show')) {
                            profileDropdown.classList.remove('show');
                        } else {
                            profileDropdown.classList.add('show');
                        }
                    } else {
                        const displayName =
                            document.getElementById('adminName') ? document.getElementById('adminName').textContent : 'Admin';
                        showTransientHint('Profile: ' + displayName + '. Click Edit Profile to change.', 'info');
                    }
                    return;
                }

                adminProfileFileInput.click();
            });
        }

        const adminName = document.getElementById('adminName');
        if (adminName) {
            adminName.addEventListener('click', function (e) {
                if (e.target.tagName === 'A') return;
                const profileDropdown = document.getElementById('profileDropdown');
                if (profileDropdown) {
                    if (profileDropdown.classList.contains('show')) {
                        profileDropdown.classList.remove('show');
                    } else {
                        profileDropdown.classList.add('show');
                    }
                }
            });
        }

        const adminProfile      = document.getElementById('adminProfile');
        const adminProfileInput = document.getElementById('adminProfileFileInput');

        const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
        const ALLOWED_PROFILE_MIME = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];

        if (adminProfile && adminProfileInput) {
            adminProfileInput.addEventListener('change', function () {
                const file = adminProfileInput.files && adminProfileInput.files[0];
                if (!file) return;

                if (ALLOWED_PROFILE_MIME.indexOf(file.type) === -1) {
                    showTransientHint('Please choose a JPG, PNG, or WEBP image.');
                    return;
                }

                if (file.size > MAX_PROFILE_IMAGE_BYTES) {
                    showTransientHint('Image is too large. Please choose a file under 2 MB.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (ev) {
                    const dataUrl = ev.target && ev.target.result;
                    if (typeof dataUrl !== 'string' || !dataUrl) {
                        showTransientHint('Could not read that image. Please try again.');
                        return;
                    }

                    try {
                        localStorage.setItem(STORAGE_KEY_PROFILE_IMAGE, dataUrl);
                    } catch (e) {
                        console.warn('Could not save profile image.', e);
                        showTransientHint('Image could not be saved (storage full).');
                        return;
                    }

                    loadProfileData();
                    applySharedProfileImage();
                    if (typeof populateProfileDropdown === 'function') populateProfileDropdown();

                    showTransientHint('Profile photo updated.', 'success');
                };
                reader.onerror = function () {
                    showTransientHint('Could not read that image. Please try again.');
                };
                reader.readAsDataURL(file);
            });
        }

        if (page !== 'index.html' && !justLoggedOut) {
            protectPage();
        }

        initSidebar();
        initSidebarNavigation();
        initLogoutHandlers();

        switch (page) {
            case 'index.html':
                initLoginPage();
                break;

            case 'dashboard.html':
                if (typeof initDashboard === 'function') initDashboard();
                break;

            case 'teachers.html':
                if (typeof initTeachers === 'function') initTeachers();
                break;

            case 'users.html':
                if (typeof initUsers === 'function') initUsers();
                break;

            case 'subjects.html':
                if (typeof initSubjects === 'function') initSubjects();
                break;

            case 'Students-Page.html':
                if (typeof initStudents === 'function') initStudents();
                break;

            case 'settings.html':
                if (typeof initSettings === 'function') initSettings();
                if (typeof initSettingsControlCenter === 'function') initSettingsControlCenter();
                break;

            case 'fees.html':
                if (typeof initFees === 'function') initFees();
                break;

            case 'results.html':
                if (typeof initResults === 'function') initResults();
                break;

            case 'exams.html':
                if (typeof initExams === 'function') initExams();
                break;

            case 'notices.html':
                if (typeof initNotices === 'function') initNotices();
                break;

            case 'classes.html':
                if (typeof initClasses === 'function') initClasses();
                break;

            case 'attendance.html':
                if (typeof initAttendance === 'function') initAttendance();
                break;

            default:
                if (page === 'login.html' || page === '') {
                    initLoginPage();
                }
                break;
        }

        if (window.location.hash === '#add') {
            const addButtonIds = [
                'addStudentBtn', 'addTeacherBtn', 'addClassBtn', 'addSubjectBtn',
                'addExamBtn', 'addResultBtn', 'addFeeBtn', 'addNoticeBtn', 'addUserBtn'
            ];
            setTimeout(function () {
                for (let i = 0; i < addButtonIds.length; i++) {
                    const btn = document.getElementById(addButtonIds[i]);
                    if (btn) {
                        btn.click();
                        break;
                    }
                }
                try {
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                } catch (e) { /* ignore */ }
            }, 150);
        }
    }

    /* ============ PROFILE IMAGE: SYNC ON EVERY PAGE ============ */
    function initSharedProfileImage() {
        bindProfileImageControls();
        applySharedProfileImage();

        applySharedSchoolLogo();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applySharedSchoolLogo);
        }
        window.addEventListener('load', applySharedSchoolLogo);
        window.addEventListener('pageshow', applySharedSchoolLogo);
        window.addEventListener('storage', function (e) {
            if (e.key === 'schoolSettings' || e.key === null) {
                applySharedSchoolLogo();
            }
        });

        if (document.getElementById('loginForm')) {
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applySharedProfileImage);
        }

        window.addEventListener('load', applySharedProfileImage);
        window.addEventListener('pageshow', applySharedProfileImage);

        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY_PROFILE_IMAGE || e.key === null) {
                applySharedProfileImage();
            }
        });
    }

    function bindProfileImageControls() {
        const input          = document.getElementById('adminProfileFileInput');
        const dropdownAvatar = document.getElementById('profileDropdownAvatar');
        const changePhotoBtn = document.getElementById('pdChangePhoto');

        function openPicker() {
            if (!input) return;
            input.value = '';
            input.click();
        }

        if (dropdownAvatar && !dropdownAvatar.dataset.profilePhotoBound) {
            dropdownAvatar.dataset.profilePhotoBound = '1';
            dropdownAvatar.addEventListener('click', function (e) {
                e.stopPropagation();
                openPicker();
            });
            dropdownAvatar.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPicker();
                }
            });
        }

        if (changePhotoBtn && !changePhotoBtn.dataset.profilePhotoBound) {
            changePhotoBtn.dataset.profilePhotoBound = '1';
            changePhotoBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openPicker();
            });
        }

        if (input && !input.dataset.profilePhotoBound) {
            input.dataset.profilePhotoBound = '1';
            input.addEventListener('change', applySharedProfileImage);
        }
    }

    /* ============ SMOOTH NAVIGATION ============ */
    function initSmoothNavigation() {
        const htmlEl = document.documentElement;
        htmlEl.classList.add('smooth-nav');

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                document.body.classList.add('nav-ready');
            });
        });

        window.addEventListener('pageshow', function () {
            document.body.classList.remove('nav-leaving');
            document.body.classList.add('nav-ready');
        });

        const prefetched = {};

        function resolveInternalUrl(href) {
            if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return null;
            let url;
            try {
                url = new URL(href, window.location.href);
            } catch (e) { return null; }
            if (url.origin !== window.location.origin) return null;
            if (!/\.html?$/i.test(url.pathname)) return null;
            return url;
        }

        function prefetch(url) {
            const key = url.href;
            if (prefetched[key]) return;
            prefetched[key] = true;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = key;
            link.as = 'document';
            document.head.appendChild(link);
        }

        function navigateTo(url) {
            if (url.pathname === window.location.pathname && url.search === window.location.search) {
                window.location.hash = url.hash;
                return;
            }
            document.body.classList.add('nav-leaving');
            setTimeout(function () {
                window.location.href = url.href;
            }, 170);
        }

        document.addEventListener('mouseover', function (e) {
            const a = e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            const url = resolveInternalUrl(a.getAttribute('href'));
            if (url) prefetch(url);
        }, { passive: true });

        document.addEventListener('touchstart', function (e) {
            const a = e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            const url = resolveInternalUrl(a.getAttribute('href'));
            if (url) prefetch(url);
        }, { passive: true });

        document.addEventListener('click', function (e) {
            if (e.defaultPrevented) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const a = e.target.closest ? e.target.closest('a[href]') : null;
            if (a) {
                if (a.target || a.hasAttribute('download')) return;
                const url = resolveInternalUrl(a.getAttribute('href'));
                if (!url) return;
                e.preventDefault();
                navigateTo(url);
                return;
            }

            const onclickEl = e.target.closest ? e.target.closest('[onclick]') : null;
            if (onclickEl) {
                const handler = onclickEl.getAttribute('onclick') || '';
                const match = handler.match(/window\.location\.href\s*=\s*['"]([^'"]+\.html?)['"]/i);
                if (!match) return;
                const url = resolveInternalUrl(match[1]);
                if (!url) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                navigateTo(url);
            }
        }, true);

        const idle = window.requestIdleCallback || function (cb) { setTimeout(cb, 800); };
        idle(function () {
            document.querySelectorAll('.sidebar-menu a[href]').forEach(function (a) {
                const url = resolveInternalUrl(a.getAttribute('href'));
                if (url) prefetch(url);
            });
        });
    }

    // === Start ===
    init();
    initSharedProfileImage();
    initSmoothNavigation();

})();

/* =============================================
   THREE-DOT ACTION MENU — DROPDOWN POSITIONING
   .action-menu-dropdown lives inside .table-scroll
   / .table-card (overflow auto/hidden), so menus on
   rows near the bottom of a table were clipped and
   unclickable. This re-anchors the open dropdown in
   document space (outside the clipping ancestors),
   preferring below the button, flipping above when
   there is not enough room, and clamping into view.
   Called from each page's existing menu toggle
   handler — no extra event listeners are added.
   ============================================= */
function positionActionDropdown(dropdown, menuBtn) {
    if (!dropdown || !menuBtn) return;
    try {
        const wrap = menuBtn.parentElement;
        if (wrap) wrap.style.position = 'static';

        dropdown.style.position = 'absolute';
        dropdown.style.right = 'auto';
        dropdown.style.left = '0px';
        dropdown.style.top = '0px';

        const dr = dropdown.getBoundingClientRect();
        const br = menuBtn.getBoundingClientRect();
        const sx = window.pageXOffset || document.documentElement.scrollLeft || 0;
        const sy = window.pageYOffset || document.documentElement.scrollTop || 0;
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;

        let left = br.right - dr.width;
        const minLeft = 8;
        const maxLeft = vw - dr.width - 8;
        if (left < minLeft) left = minLeft;
        if (left > maxLeft) left = Math.max(minLeft, maxLeft);

        let top = br.bottom + 4 + sy;
        const wouldOverflowBottom = (br.bottom + 4 + dr.height) > vh;
        const roomAbove = (br.top - dr.height - 4) >= 0;
        if (wouldOverflowBottom && roomAbove) {
            top = br.top - dr.height - 4 + sy;
        }

        const docBottom = document.documentElement.scrollHeight;
        if (top + dr.height > docBottom) {
            top = Math.max(sy + 4, docBottom - dr.height - 4);
        }

        const header = document.querySelector('.top-header');
        if (header) {
            const hr = header.getBoundingClientRect();
            const minTop = hr.bottom + sy + 8;
            if (top < minTop) top = minTop;
        }
        if (top < sy + 4) top = sy + 4;

        dropdown.style.left = Math.round(left) + 'px';
        dropdown.style.top = Math.round(top) + 'px';
    } catch (e) { /* keep default position */ }
}

/* ============================================================
   DASHBOARD IIFE
   ============================================================ */
(function () {
    'use strict';

    if ((window.location.pathname.split('/').pop() || 'index.html') !== 'dashboard.html') return;

    // ================= AUTH CONFIG =================
    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const STORAGE_KEY_PROFILE_IMAGE = 'adminProfileImage';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_STUDENTS = 'studentsData';
    const STORAGE_KEY_TEACHERS = 'teachersData';
    const STORAGE_KEY_CLASSES = 'classesData';
    const STORAGE_KEY_FEES = 'feesData';
    const STORAGE_KEY_ATTENDANCE = 'attendanceRecords';
    const STORAGE_KEY_NOTIFICATIONS = 'dashboardNotifications';

    let isRedirecting = false;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const DASHBOARD_DATA = {
        stats: {
            students: 1250,
            teachers: 85,
            classes: 32,
            fees: 920
        },
        attendance: [
            { day: 'Mon', value: 78 },
            { day: 'Tue', value: 85 },
            { day: 'Wed', value: 92 },
            { day: 'Thu', value: 88 },
            { day: 'Fri', value: 95 }
        ],
        recentStudents: [
            { name: 'Ahmad', className: '10th', status: 'Active' },
            { name: 'Ali',   className: '9th',  status: 'Active' }
        ]
    };

    const SEED_NOTIFICATIONS = [
        {
            id: 'n1',
            type: 'info',
            title: 'Welcome to School Management',
            message: 'Your dashboard is ready. Explore the sidebar to manage students, teachers, and more.',
            timestamp: Date.now() - 1000 * 60 * 5,
            read: false
        },
        {
            id: 'n2',
            type: 'success',
            title: 'New student added',
            message: 'Ahmad has been successfully added to class 10th.',
            timestamp: Date.now() - 1000 * 60 * 60 * 2,
            read: false
        },
        {
            id: 'n3',
            type: 'warning',
            title: 'Fee payment pending',
            message: '3 students have outstanding fees for this month.',
            timestamp: Date.now() - 1000 * 60 * 60 * 24,
            read: true
        }
    ];

    const sidebar           = document.getElementById('sidebar');
    const sidebarBackdrop   = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn     = document.getElementById('mobileMenuBtn');
    const logoutBtn         = document.getElementById('logoutBtn');
    const globalSearch      = document.getElementById('globalSearch');
    const searchHint        = document.getElementById('searchHint');
    const studentsTableBody = document.getElementById('studentsTableBody');
    const adminAvatar       = document.getElementById('adminAvatar');
    const adminName         = document.getElementById('adminName');
    const notificationBtn   = document.getElementById('notificationBtn');
    const addStudentBtn     = document.getElementById('addStudentBtn');

    const notificationPanel  = document.getElementById('notificationPanel');
    const notificationList   = document.getElementById('notificationList');
    const markAllReadBtn     = document.getElementById('markAllReadBtn');

    function loadDashboardStudentsData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('[Dashboard] Failed to load students data.', e);
            return [];
        }
    }

    function saveDashboardStudentsData(list) {
        try {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Dashboard] Failed to save students data.', e);
        }
    }

    let studentsData = loadDashboardStudentsData();

    function generateStudentId() {
        var maxNum = 0;
        studentsData.forEach(function (s) {
            var n = parseInt(String(s.id || '').replace(/\D/g, ''), 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        var next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function loadDashboardTeachersData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_TEACHERS);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('[Dashboard] Failed to load teachers data.', e);
            return [];
        }
    }

    function saveDashboardTeachersData(list) {
        try {
            localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Dashboard] Failed to save teachers data.', e);
        }
    }

    let teachersData = loadDashboardTeachersData();

    function loadDashboardClassesData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('[Dashboard] Failed to load classes data.', e);
            return [];
        }
    }

    let classesData = loadDashboardClassesData();

    function loadDashboardFeesData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_FEES);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('[Dashboard] Failed to load fees data.', e);
            return [];
        }
    }

    let feesData = loadDashboardFeesData();

    function loadDashboardAttendanceData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
            return {};
        } catch (e) {
            console.warn('[Dashboard] Failed to load attendance data.', e);
            return {};
        }
    }

    let attendanceData = loadDashboardAttendanceData();

    function loadNotifications() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
                return SEED_NOTIFICATIONS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Dashboard] Notifications read failed, using seed.', e);
            return SEED_NOTIFICATIONS.slice();
        }
    }

    function saveNotifications(list) {
        try {
            localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Dashboard] Could not save notifications.', e);
        }
    }

    let notifications = loadNotifications();

    function getUnreadCount() {
        return notifications.filter(function (n) { return !n.read; }).length;
    }

    function updateNotificationBadge() {
        if (!notificationBtn) return;
        var oldBadge = notificationBtn.querySelector('.badge-count');
        if (oldBadge) oldBadge.remove();
        var oldDot = notificationBtn.querySelector('.badge-dot');
        if (oldDot) oldDot.remove();

        var count = getUnreadCount();
        if (count > 0) {
            var badge = document.createElement('span');
            badge.className = 'badge-count';
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.setAttribute('aria-hidden', 'true');
            notificationBtn.appendChild(badge);
        }
    }

    function formatRelativeTime(ts) {
        var diff = Date.now() - Number(ts || 0);
        if (isNaN(diff) || diff < 0) diff = 0;
        var sec = Math.floor(diff / 1000);
        if (sec < 60) return 'Just now';
        var min = Math.floor(sec / 60);
        if (min < 60) return min + ' min ago';
        var hr = Math.floor(min / 60);
        if (hr < 24) return hr + ' hour' + (hr === 1 ? '' : 's') + ' ago';
        var day = Math.floor(hr / 24);
        if (day < 7) return day + ' day' + (day === 1 ? '' : 's') + ' ago';
        var d = new Date(Number(ts));
        return d.toLocaleDateString();
    }

    function renderNotifications() {
        if (!notificationList) return;
        notificationList.innerHTML = '';

        if (!notifications || notifications.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'notification-empty';
            empty.innerHTML = '<i class="far fa-bell-slash"></i>You have no notifications.';
            notificationList.appendChild(empty);
        } else {
            var sorted = notifications.slice().sort(function (a, b) {
                return (b.timestamp || 0) - (a.timestamp || 0);
            });

            sorted.forEach(function (n) {
                var item = document.createElement('div');
                item.className = 'notification-item ' + (n.type || 'info') + (n.read ? '' : ' unread');
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                item.dataset.id = n.id;

                var iconClass = 'fa-info-circle';
                if (n.type === 'success') iconClass = 'fa-circle-check';
                else if (n.type === 'warning') iconClass = 'fa-triangle-exclamation';

                item.innerHTML =
                    '<div class="notification-item-icon"><i class="fas ' + iconClass + '"></i></div>' +
                    '<div class="notification-item-content">' +
                        '<div class="notification-item-title">' + escapeHtml(n.title || '') + '</div>' +
                        '<div class="notification-item-message">' + escapeHtml(n.message || '') + '</div>' +
                        '<div class="notification-item-time">' + escapeHtml(formatRelativeTime(n.timestamp)) + '</div>' +
                    '</div>' +
                    (n.read ? '' : '<span class="notification-item-dot" aria-hidden="true"></span>');

                item.addEventListener('click', function () {
                    markNotificationRead(n.id);
                });
                item.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        markNotificationRead(n.id);
                    }
                });

                notificationList.appendChild(item);
            });
        }

        if (markAllReadBtn) {
            markAllReadBtn.disabled = getUnreadCount() === 0;
        }

        updateNotificationBadge();
    }

    function markNotificationRead(id) {
        var changed = false;
        notifications = notifications.map(function (n) {
            if (n.id === id && !n.read) {
                changed = true;
                return Object.assign({}, n, { read: true });
            }
            return n;
        });
        if (changed) {
            saveNotifications(notifications);
            renderNotifications();
        }
    }

    function markAllNotificationsRead() {
        if (getUnreadCount() === 0) return;
        notifications = notifications.map(function (n) {
            return Object.assign({}, n, { read: true });
        });
        saveNotifications(notifications);
        renderNotifications();
        showTransientHint('All notifications marked as read.', 'success');
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function positionNotificationPanelForViewport() {
        if (!notificationPanel) return;
        if (!window.matchMedia('(max-width: 900px)').matches) {
            notificationPanel.style.left = '';
            notificationPanel.style.right = '';
            return;
        }
        var gap = 12;
        var width = notificationPanel.offsetWidth;
        var anchorRight = notificationBtn
            ? notificationBtn.getBoundingClientRect().right
            : window.innerWidth - gap;
        var left = anchorRight - width;
        if (left + width > window.innerWidth - gap) left = window.innerWidth - width - gap;
        if (left < gap) left = gap;
        notificationPanel.style.left = left + 'px';
        notificationPanel.style.right = 'auto';
    }

    function openNotificationPanel() {
        if (!notificationPanel) return;
        if (typeof closeProfileDropdown === 'function') closeProfileDropdown();
        renderNotifications();
        positionNotificationPanelForViewport();
        notificationPanel.classList.add('show');
    }

    function closeNotificationPanel() {
        if (!notificationPanel) return;
        notificationPanel.classList.remove('show');
    }

    function toggleNotificationPanel() {
        if (!notificationPanel) return;
        if (notificationPanel.classList.contains('show')) closeNotificationPanel();
        else openNotificationPanel();
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleNotificationPanel();
        });
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            markAllNotificationsRead();
        });
    }

    document.addEventListener('click', function (e) {
        if (!notificationPanel || !notificationPanel.classList.contains('show')) return;
        if (notificationPanel.contains(e.target)) return;
        if (notificationBtn && notificationBtn.contains(e.target)) return;
        closeNotificationPanel();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeNotificationPanel();
    });

    window.addEventListener('resize', positionNotificationPanelForViewport);

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                if (currentPage !== 'index.html') {
                    console.log('[Dashboard] Not logged in — redirecting to login page');
                    window.location.href = LOGIN_PAGE_URL;
                }
            }
        } else {
            console.log('[Dashboard] Session OK — rendering dashboard');
        }
    })();

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    // ✅ HAMBURGER FIX #3 — the duplicate click handler on mobileMenuBtn
    // that used to live here has been REMOVED. The shared initSidebar()
    // in the top IIFE already binds a single click handler that:
    //   - toggles .open on the sidebar
    //   - toggles .show on the backdrop
    //   - swaps the icon between ☰ and ✕
    //   - syncs aria-expanded / aria-label
    // Binding a second handler here fired twice per click and cancelled
    // itself out, which is why the button appeared to do nothing.
    // The backdrop click listener is still kept here because this
    // closeSidebar() references the dashboard's local sidebarBackdrop.

    sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const sidebarLinks = sidebar.querySelectorAll('a[data-page]');
    sidebarLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            sidebar.querySelectorAll('li').forEach(function (li) {
                li.classList.remove('active');
            });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        console.log('[Dashboard] Logging out — redirecting to login page');
        isRedirecting = true;
        try {
            sessionStorage.setItem('__just_logged_out', '1');
        } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let profileImage = null;
        let savedName = null;
        let fatherName = null;
        let role = null;
        let className = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            profileImage = localStorage.getItem(STORAGE_KEY_PROFILE_IMAGE);
            savedName = localStorage.getItem('adminDisplayName');
            fatherName = localStorage.getItem('adminFatherName');
            role = localStorage.getItem('adminRole');
            className = localStorage.getItem('adminClass');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (adminAvatar) {
            if (profileImage) {
                adminAvatar.innerHTML = '<img src="' + profileImage + '" alt="Profile">';
            } else if (email) {
                const initial = email.trim().charAt(0).toUpperCase() || 'A';
                adminAvatar.innerHTML = '<span>' + initial + '</span>';
            } else {
                adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
        if (adminName) {
            adminName.textContent = displayName;
        }

        if (pdName)  pdName.textContent  = displayName;
        if (pdEmail) pdEmail.textContent = email || '—';
        if (pdRole)  pdRole.textContent  = role || 'Administrator';
    }

    const profileDropdown        = document.getElementById('profileDropdown');
    const profileDropdownAvatar  = document.getElementById('profileDropdownAvatar');
    const pdName                 = document.getElementById('pdName');
    const pdEmail                = document.getElementById('pdEmail');
    const pdRole                 = document.getElementById('pdRole');
    const pdEditProfile          = document.getElementById('pdEditProfile');
    const pdChangePhoto          = document.getElementById('pdChangePhoto');
    const pdLogout               = document.getElementById('pdLogout');
    const adminProfileInput     = document.getElementById('adminProfileFileInput');

    function closeProfileDropdown() {
        if (!profileDropdown) return;
        profileDropdown.classList.remove('show');
    }

    function populateProfileDropdown() {
        let email = null;
        let savedName = null;
        let profileImage = null;
        let fatherName = null;
        let role = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
            profileImage = localStorage.getItem(STORAGE_KEY_PROFILE_IMAGE);
            fatherName = localStorage.getItem('adminFatherName');
            role = localStorage.getItem('adminRole');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (pdName)  pdName.textContent  = displayName;
        if (pdEmail) pdEmail.textContent = email || '—';
        if (pdRole)  pdRole.textContent  = role || 'Administrator';

        if (profileDropdownAvatar) {
            if (profileImage) {
                profileDropdownAvatar.innerHTML = '<img src="' + profileImage + '" alt="Profile">';
            } else if (email) {
                const initial = email.trim().charAt(0).toUpperCase() || 'A';
                profileDropdownAvatar.innerHTML = '<span>' + initial + '</span>';
            } else {
                profileDropdownAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
    }

    if (profileDropdownAvatar && adminProfileInput && !profileDropdownAvatar.dataset.profilePhotoBound) {
        profileDropdownAvatar.addEventListener('click', function (e) {
            e.stopPropagation();
            adminProfileInput.value = '';
            adminProfileInput.click();
        });
        profileDropdownAvatar.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                adminProfileInput.value = '';
                adminProfileInput.click();
            }
        });
    }

    if (pdChangePhoto && adminProfileInput && !pdChangePhoto.dataset.profilePhotoBound) {
        pdChangePhoto.addEventListener('click', function (e) {
            e.stopPropagation();
            adminProfileInput.value = '';
            adminProfileInput.click();
        });
    }

    if (pdEditProfile) {
        pdEditProfile.addEventListener('click', function (e) {
            e.stopPropagation();
            closeProfileDropdown();
            openEditProfileModal();
        });
    }

    if (pdLogout) {
        pdLogout.addEventListener('click', function (e) {
            e.stopPropagation();
            closeProfileDropdown();
            handleLogout();
        });
    }

    document.addEventListener('click', function (e) {
        if (!profileDropdown || !profileDropdown.classList.contains('show')) return;
        if (profileDropdown.contains(e.target)) return;
        if (adminProfile && adminProfile.contains(e.target)) return;
        closeProfileDropdown();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeProfileDropdown();
    });

    const editProfileOverlay    = document.getElementById('editProfileOverlay');
    const editProfileClose      = document.getElementById('editProfileClose');
    const editProfileCancel     = document.getElementById('editProfileCancel');
    const editProfileForm       = document.getElementById('editProfileForm');
    const editProfileNameInput  = document.getElementById('editProfileNameInput');
    const editProfileFatherInput = document.getElementById('editProfileFatherInput');
    const editProfileEmailInput  = document.getElementById('editProfileEmailInput');
    const editProfilePhoneInput  = document.getElementById('editProfilePhoneInput');
    const editProfileRoleInput   = document.getElementById('editProfileRoleInput');
    const editProfileClassInput  = document.getElementById('editProfileClassInput');

    function openEditProfileModal() {
        if (!editProfileOverlay) return;

        let email = null;
        let savedName = null;
        let fatherName = null;
        let storedEmail = null;
        let phone = null;
        let role = null;
        let className = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
            fatherName = localStorage.getItem('adminFatherName');
            storedEmail = localStorage.getItem('adminEmail');
            phone = localStorage.getItem('adminPhone');
            role = localStorage.getItem('adminRole');
            className = localStorage.getItem('adminClass');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        editProfileNameInput.value = (savedName && savedName.trim()) || fallbackName;
        if (editProfileFatherInput) editProfileFatherInput.value = fatherName || '';
        if (editProfileEmailInput)  editProfileEmailInput.value  = storedEmail || email || '';
        if (editProfilePhoneInput)  editProfilePhoneInput.value  = phone || '';
        if (editProfileRoleInput)   editProfileRoleInput.value   = role || '';
        if (editProfileClassInput)  editProfileClassInput.value  = className || '';

        editProfileOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(function () {
            editProfileNameInput.focus();
            editProfileNameInput.select();
        }, 50);
    }

    function closeEditProfileModal() {
        if (!editProfileOverlay) return;
        editProfileOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (editProfileClose)  editProfileClose.addEventListener('click', closeEditProfileModal);
    if (editProfileCancel) editProfileCancel.addEventListener('click', closeEditProfileModal);
    if (editProfileOverlay) {
        editProfileOverlay.addEventListener('click', function (e) {
            if (e.target === editProfileOverlay) closeEditProfileModal();
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (editProfileOverlay && editProfileOverlay.classList.contains('open')) {
            closeEditProfileModal();
        }
    });

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const value = (editProfileNameInput.value || '').trim();
            if (!value) {
                showTransientHint('Please enter a display name.');
                editProfileNameInput.focus();
                return;
            }

            try {
                localStorage.setItem('adminDisplayName', value);
            } catch (err) {
                showTransientHint('Could not save the name. Please try again.');
                return;
            }

            const fatherName = (editProfileFatherInput.value || '').trim();
            const email = (editProfileEmailInput.value || '').trim();
            const phone = (editProfilePhoneInput.value || '').trim();
            const role = editProfileRoleInput.value || 'Admin';
            const className = editProfileClassInput.value || '';

            try {
                localStorage.setItem('adminDisplayName', value);
                localStorage.setItem('adminFatherName', fatherName);
                localStorage.setItem('adminEmail', email);
                localStorage.setItem('adminPhone', phone);
                localStorage.setItem('adminRole', role);
                localStorage.setItem('adminClass', className);
            } catch (err) {
                showTransientHint('Could not save profile data. Please try again.');
                return;
            }

            loadAdminInfo();
            populateProfileDropdown();
            closeEditProfileModal();
            showTransientHint('Profile updated.', 'success');
        });
    }

    const addStudentOverlay = document.getElementById('addStudentOverlay');
    const addStudentClose   = document.getElementById('addStudentClose');
    const addStudentCancel  = document.getElementById('addStudentCancel');
    const addStudentForm    = document.getElementById('addStudentForm');
    const addStudentName    = document.getElementById('addStudentName');
    const addStudentClass   = document.getElementById('addStudentClass');
    const addStudentPhone   = document.getElementById('addStudentPhone');
    const addStudentStatus  = document.getElementById('addStudentStatus');

    function openAddStudentModal() {
        if (!addStudentOverlay) return;
        addStudentName.value = '';
        addStudentClass.value = '';
        addStudentPhone.value = '';
        addStudentStatus.value = 'Active';

        addStudentOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(function () {
            addStudentName.focus();
        }, 50);
    }

    function closeAddStudentModal() {
        if (!addStudentOverlay) return;
        addStudentOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addStudentBtn)     addStudentBtn.addEventListener('click', openAddStudentModal);
    if (addStudentClose)   addStudentClose.addEventListener('click', closeAddStudentModal);
    if (addStudentCancel)  addStudentCancel.addEventListener('click', closeAddStudentModal);

    if (addStudentOverlay) {
        addStudentOverlay.addEventListener('click', function (e) {
            if (e.target === addStudentOverlay) closeAddStudentModal();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAddStudentModal();
    });

    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name      = (addStudentName.value || '').trim();
            const className = (addStudentClass.value || '').trim();
            const phone     = (addStudentPhone.value || '').trim();
            const status    = (addStudentStatus.value || '').trim() || 'Active';

            if (!name) {
                showTransientHint('Please enter the student name.');
                addStudentName.focus();
                return;
            }
            if (!className) {
                showTransientHint('Please enter the class.');
                addStudentClass.focus();
                return;
            }

            studentsData = loadDashboardStudentsData();

            const newStudent = {
                id: generateStudentId(),
                name: name,
                className: className,
                phone: phone,
                status: status
            };

            studentsData.push(newStudent);
            saveDashboardStudentsData(studentsData);

            renderStudents(studentsData);
            updateStudentsStat();

            closeAddStudentModal();
            showTransientHint('Student added successfully.', 'success');
        });
    }

    function renderStats() {
        Object.keys(DASHBOARD_DATA.stats).forEach(function (key) {
            const el = document.querySelector('[data-stat="' + key + '"]');
            if (el) el.textContent = DASHBOARD_DATA.stats[key];
        });
        updateStudentsStat();
        updateTeachersStat();
        updateClassesStat();
        updateFeesStat();
    }

    function updateStudentsStat() {
        const students = loadDashboardStudentsData();
        const count = students ? students.length : 0;
        const el = document.querySelector('[data-stat="students"]');
        if (el) el.textContent = count;
    }

    function updateTeachersStat() {
        const teachers = loadDashboardTeachersData();
        const count = teachers ? teachers.length : 0;
        const el = document.querySelector('[data-stat="teachers"]');
        if (el) el.textContent = count;
    }

    function updateClassesStat() {
        const classes = loadDashboardClassesData();
        const count = classes ? classes.length : 0;
        const el = document.querySelector('[data-stat="classes"]');
        if (el) el.textContent = count;
    }

    function updateFeesStat() {
        const fees = loadDashboardFeesData();
        const count = fees ? fees.length : 0;
        const el = document.querySelector('[data-stat="fees"]');
        if (el) el.textContent = count;
    }

    var ATTENDANCE_CHART_CLASSES = [
        { key: '5',  label: '5th Class',  color: '#3b82f6' },
        { key: '6',  label: '6th Class',  color: '#8b5cf6' },
        { key: '7',  label: '7th Class',  color: '#10b981' },
        { key: '8',  label: '8th Class',  color: '#f59e0b' },
        { key: '9',  label: '9th Class',  color: '#ef4444' },
        { key: '10', label: '10th Class', color: '#06b6d4' },
        { key: '11', label: '11th Class', color: '#ec4899' },
        { key: '12', label: '12th Class', color: '#64748b' }
    ];
    var attendanceChartHidden = {};

    function attendanceChartClassKey(className) {
        if (!className) return null;
        var m = String(className).match(/\d+/);
        if (!m) return null;
        var n = parseInt(m[0], 10);
        return (n >= 5 && n <= 12) ? String(n) : null;
    }

    function attendanceChartLocalISO(d) {
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
    }

    function attendanceChartFormatLongDate(iso) {
        var d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return iso;
        try {
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return iso;
        }
    }

    function attendanceChartFormatShortDate(iso) {
        var d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return iso;
        try {
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch (e) {
            return iso;
        }
    }

    function buildAttendanceChartModel(rangeDays) {
        var byClassDate = {};
        var dateSet = {};
        var totalPresent = 0;
        var totalAbsent = 0;
        var totalLeave = 0;

        Object.keys(attendanceData).forEach(function (bucketKey) {
            var bucket = attendanceData[bucketKey];
            if (!bucket || typeof bucket !== 'object') return;

            var parts = String(bucketKey).split('|');
            var date = parts[0];
            var classKey = attendanceChartClassKey(parts[1]);
            if (!date || !classKey) return;

            var present = 0;
            var absent = 0;
            var leave = 0;
            var total = 0;

            Object.keys(bucket).forEach(function (sid) {
                if (sid === '__savedAt') return;
                var record = bucket[sid];
                if (!record || !record.status) return;
                total++;
                if (record.status === 'Present') present++;
                else if (record.status === 'Absent') absent++;
                else if (record.status === 'Leave') leave++;
            });
            if (total === 0) return;

            var k = classKey + '|' + date;
            if (!byClassDate[k]) byClassDate[k] = { total: 0, present: 0, absent: 0, leave: 0 };
            byClassDate[k].total += total;
            byClassDate[k].present += present;
            byClassDate[k].absent += absent;
            byClassDate[k].leave += leave;

            dateSet[date] = true;
            totalPresent += present;
            totalAbsent += absent;
            totalLeave += leave;
        });

        var cutoff = null;
        if (rangeDays > 0) {
            var d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (rangeDays - 1));
            cutoff = attendanceChartLocalISO(d);
        }

        var dates = Object.keys(dateSet).sort();
        if (cutoff) {
            dates = dates.filter(function (dt) { return dt >= cutoff; });
        }

        var series = {};
        ATTENDANCE_CHART_CLASSES.forEach(function (cls) {
            var pts = {};
            dates.forEach(function (dt) {
                var v = byClassDate[cls.key + '|' + dt];
                if (!v) return;
                pts[dt] = {
                    total: v.total,
                    present: v.present,
                    absent: v.absent,
                    leave: v.leave,
                    percent: Math.round((v.present / v.total) * 1000) / 10
                };
            });
            series[cls.key] = pts;
        });

        return {
            dates: dates,
            series: series,
            totals: { present: totalPresent, absent: totalAbsent, leave: totalLeave }
        };
    }

    function attendanceChartSvgEl(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
        }
        return el;
    }

    function attendanceChartMeta(classKey) {
        for (var i = 0; i < ATTENDANCE_CHART_CLASSES.length; i++) {
            if (ATTENDANCE_CHART_CLASSES[i].key === classKey) return ATTENDANCE_CHART_CLASSES[i];
        }
        return null;
    }

    function renderAttendanceChartLegend(model, legendEl) {
        if (!legendEl) return;
        legendEl.innerHTML = '';

        ATTENDANCE_CHART_CLASSES.forEach(function (cls) {
            var hasData = model.dates.some(function (dt) { return !!model.series[cls.key][dt]; });

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'attendance-chart-legend-item';
            btn.setAttribute('data-class', cls.key);
            btn.setAttribute('aria-pressed', attendanceChartHidden[cls.key] ? 'false' : 'true');
            btn.title = hasData
                ? cls.label + ' — click to show/hide'
                : cls.label + ' — no records in range';
            if (!hasData) btn.classList.add('is-empty');
            if (attendanceChartHidden[cls.key]) btn.classList.add('is-hidden');

            var swatch = document.createElement('span');
            swatch.className = 'swatch';
            swatch.style.background = cls.color;

            var label = document.createElement('span');
            label.textContent = cls.label;

            btn.appendChild(swatch);
            btn.appendChild(label);
            legendEl.appendChild(btn);
        });
    }

    function renderAttendanceChart() {
        var area = document.getElementById('attendanceChart');
        if (!area) return;

        area.classList.add('attendance-chart-mode');
        area.innerHTML = '';

        var legendEl = document.getElementById('attendanceChartLegend');
        var rangeSelect = document.getElementById('attendanceChartRange');

        if (rangeSelect && rangeSelect.dataset.acBound !== '1') {
            rangeSelect.dataset.acBound = '1';
            rangeSelect.addEventListener('change', renderAttendanceChart);
        }

        if (legendEl && legendEl.dataset.acBound !== '1') {
            legendEl.dataset.acBound = '1';
            legendEl.addEventListener('click', function (e) {
                var btn = e.target && e.target.closest ? e.target.closest('.attendance-chart-legend-item') : null;
                if (!btn) return;
                var key = btn.getAttribute('data-class');
                if (!key) return;
                attendanceChartHidden[key] = !attendanceChartHidden[key];
                renderAttendanceChart();
            });
            legendEl.addEventListener('mouseover', function (e) {
                var btn = e.target && e.target.closest ? e.target.closest('.attendance-chart-legend-item') : null;
                setAttendanceChartFocus(btn ? btn.getAttribute('data-class') : null);
            });
            legendEl.addEventListener('mouseout', function (e) {
                var btn = e.target && e.target.closest ? e.target.closest('.attendance-chart-legend-item') : null;
                if (btn) setAttendanceChartFocus(null);
            });
        }

        var rangeDays = 0;
        if (rangeSelect) {
            var rv = parseInt(rangeSelect.value, 10);
            rangeDays = rv > 0 ? rv : 0;
        }

        var model = buildAttendanceChartModel(rangeDays);
        updateAttendanceTotals(model.totals.present, model.totals.absent, model.totals.leave);
        renderAttendanceChartLegend(model, legendEl);

        var tip = document.createElement('div');
        tip.id = 'attendanceChartTooltip';
        tip.className = 'attendance-chart-tooltip';
        tip.setAttribute('role', 'status');
        area.appendChild(tip);

        function hideTooltip() {
            tip.classList.remove('is-visible');
        }

        function showTooltip(classKey, dateISO, stats, evt) {
            var meta = attendanceChartMeta(classKey);
            if (!meta) return;

            tip.innerHTML = '';

            var title = document.createElement('div');
            title.className = 'act-title';
            var sw = document.createElement('span');
            sw.className = 'swatch';
            sw.style.background = meta.color;
            var tName = document.createElement('span');
            tName.textContent = meta.label;
            title.appendChild(sw);
            title.appendChild(tName);
            tip.appendChild(title);

            function row(label, value) {
                var r = document.createElement('div');
                r.className = 'act-row';
                var l = document.createElement('span');
                l.className = 'act-row-label';
                l.textContent = label;
                var v = document.createElement('span');
                v.className = 'act-row-value';
                v.textContent = value;
                r.appendChild(l);
                r.appendChild(v);
                tip.appendChild(r);
            }

            row('Date', attendanceChartFormatLongDate(dateISO));
            row('Total Students', String(stats.total));
            row('Present', String(stats.present));
            row('Absent', String(stats.absent));
            row('Leave', String(stats.leave));
            row('Attendance', stats.percent.toFixed(1) + '%');

            tip.classList.add('is-visible');

            var rect = area.getBoundingClientRect();
            var x = (evt && evt.clientX != null) ? evt.clientX - rect.left : rect.width / 2;
            var y = (evt && evt.clientY != null) ? evt.clientY - rect.top : rect.height / 2;
            var w = tip.offsetWidth;
            var h = tip.offsetHeight;
            var left = x + 16;
            if (left + w > rect.width - 6) left = x - w - 16;
            if (left < 6) left = 6;
            var top = y - h - 12;
            if (top < 6) top = y + 18;
            tip.style.left = left + 'px';
            tip.style.top = top + 'px';
        }

        var dates = model.dates;

        if (dates.length === 0) {
            var emptyMsg = document.createElement('div');
            emptyMsg.className = 'attendance-chart-empty';
            emptyMsg.innerHTML = '<i class="fas fa-calendar-day"></i>No attendance records yet. Go to Attendance page to mark attendance.';
            area.appendChild(emptyMsg);
            area.appendChild(tip);
            return;
        }

        var W = 820;
        var H = 300;
        var padL = 46;
        var padR = 16;
        var padT = 14;
        var padB = 32;
        var innerW = W - padL - padR;
        var innerH = H - padT - padB;
        var n = dates.length;

        function xAt(i) {
            if (n === 1) return padL + innerW / 2;
            return padL + (i * innerW) / (n - 1);
        }
        function yAt(pct) {
            var p = Math.max(0, Math.min(100, pct));
            return padT + ((100 - p) / 100) * innerH;
        }

        var svg = attendanceChartSvgEl('svg', {
            'class': 'ac-chart',
            viewBox: '0 0 ' + W + ' ' + H,
            role: 'img',
            'aria-label': 'Attendance percentage by class over time'
        });

        [0, 25, 50, 75, 100].forEach(function (pct) {
            var y = yAt(pct);
            svg.appendChild(attendanceChartSvgEl('line', {
                'class': 'ac-grid-line',
                x1: padL, y1: y, x2: W - padR, y2: y
            }));
            var lbl = attendanceChartSvgEl('text', {
                'class': 'ac-axis-label',
                x: padL - 8, y: y + 4, 'text-anchor': 'end'
            });
            lbl.textContent = pct + '%';
            svg.appendChild(lbl);
        });

        var labelStep = Math.max(1, Math.ceil(n / 8));
        dates.forEach(function (dt, i) {
            if (i % labelStep !== 0 && i !== n - 1) return;
            var lbl = attendanceChartSvgEl('text', {
                'class': 'ac-axis-label',
                x: xAt(i), y: H - 10, 'text-anchor': 'middle'
            });
            lbl.textContent = attendanceChartFormatShortDate(dt);
            svg.appendChild(lbl);
        });

        var hasAnyLine = false;

        ATTENDANCE_CHART_CLASSES.forEach(function (cls) {
            if (attendanceChartHidden[cls.key]) return;
            var pts = model.series[cls.key];
            var hasData = dates.some(function (dt) { return !!pts[dt]; });
            if (!hasData) return;
            hasAnyLine = true;

            var g = attendanceChartSvgEl('g', { 'class': 'ac-series', 'data-class': cls.key });

            var runs = [];
            var currentRun = null;
            dates.forEach(function (dt, i) {
                if (pts[dt]) {
                    if (!currentRun) { currentRun = []; runs.push(currentRun); }
                    currentRun.push({ date: dt, index: i, stats: pts[dt] });
                } else {
                    currentRun = null;
                }
            });

            runs.forEach(function (run) {
                if (run.length >= 2) {
                    var pointsAttr = run.map(function (p) {
                        return xAt(p.index) + ',' + yAt(p.stats.percent);
                    }).join(' ');

                    var line = attendanceChartSvgEl('polyline', {
                        'class': 'ac-line',
                        points: pointsAttr,
                        stroke: cls.color
                    });
                    g.appendChild(line);

                    var hit = attendanceChartSvgEl('polyline', {
                        'class': 'ac-hit',
                        points: pointsAttr
                    });
                    hit.addEventListener('mousemove', function (e) {
                        var best = run[0];
                        var bestDist = Infinity;
                        run.forEach(function (p) {
                            var px = xAt(p.index);
                            var dist = Math.abs(px * (rectScaleX()) - (e.clientX - svgRect().left));
                            if (dist < bestDist) { bestDist = dist; best = p; }
                        });
                        showTooltip(cls.key, best.date, best.stats, e);
                    });
                    g.appendChild(hit);
                }

                run.forEach(function (p) {
                    var dot = attendanceChartSvgEl('circle', {
                        'class': 'ac-dot',
                        cx: xAt(p.index),
                        cy: yAt(p.stats.percent),
                        r: 4,
                        fill: cls.color,
                        'data-class': cls.key,
                        'data-date': p.date
                    });
                    dot.addEventListener('mouseenter', function (e) {
                        showTooltip(cls.key, p.date, p.stats, e);
                    });
                    g.appendChild(dot);
                });
            });

            svg.appendChild(g);
        });

        function svgRect() { return svg.getBoundingClientRect(); }
        function rectScaleX() { var r = svgRect(); return r.width ? r.width / W : 1; }

        svg.addEventListener('mouseleave', hideTooltip);

        if (!hasAnyLine) {
            var noLine = document.createElement('div');
            noLine.className = 'attendance-chart-empty';
            noLine.innerHTML = '<i class="fas fa-chart-line"></i>No records for the visible classes in this range. Unhide classes in the legend or widen the date range.';
            area.insertBefore(noLine, tip);
        }

        area.insertBefore(svg, tip);
    }

    function updateAttendanceTotals(present, absent, leave) {
        var presentEl = document.getElementById('dashboardAttendancePresent');
        var absentEl = document.getElementById('dashboardAttendanceAbsent');
        var leaveEl = document.getElementById('dashboardAttendanceLeave');
        if (presentEl) presentEl.textContent = present;
        if (absentEl) absentEl.textContent = absent;
        if (leaveEl) leaveEl.textContent = leave;
    }

    function renderStudents(students) {
        if (!studentsTableBody) return;

        const displayedStudents = studentsData && studentsData.length > 0
            ? studentsData
            : DASHBOARD_DATA.recentStudents;

        studentsTableBody.innerHTML = '';

        if (!displayedStudents || displayedStudents.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="4" class="empty-state">' +
                '<i class="fas fa-magnifying-glass"></i>' +
                'No matching students found.</td>';
            studentsTableBody.appendChild(tr);
            return;
        }

        displayedStudents.forEach(function (student) {
            const tr = document.createElement('tr');

            const nameTd = document.createElement('td');
            nameTd.textContent = student.name;

            const classTd = document.createElement('td');
            classTd.textContent = student.className;

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'status-pill';
            pill.textContent = student.status;
            statusTd.appendChild(pill);

            const actionTd = document.createElement('td');

            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-view';
            viewBtn.type = 'button';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', function () {
                showTransientHint('Viewing student: ' + student.name + ' (' + student.className + ')');
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.type = 'button';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', function () {
                deleteStudent(student.id, student.name);
            });

            actionTd.appendChild(viewBtn);
            actionTd.appendChild(deleteBtn);

            tr.appendChild(nameTd);
            tr.appendChild(classTd);
            tr.appendChild(statusTd);
            tr.appendChild(actionTd);
            studentsTableBody.appendChild(tr);
        });
    }

    function handleSearch() {
        const query = globalSearch.value.trim().toLowerCase();

        const displayedStudents = studentsData && studentsData.length > 0
            ? studentsData
            : DASHBOARD_DATA.recentStudents;

        if (!query) {
            renderStudents(displayedStudents);
            searchHint.textContent = 'Showing all students';
            return;
        }

        const filtered = displayedStudents.filter(function (s) {
            return s.name.toLowerCase().includes(query) ||
                   s.className.toLowerCase().includes(query) ||
                   s.status.toLowerCase().includes(query);
        });

        renderStudents(filtered);

        if (filtered.length === 0) {
            searchHint.textContent = 'No results for "' + globalSearch.value.trim() + '"';
        } else {
            searchHint.textContent = 'Found ' + filtered.length + ' result(s)';
        }
    }

    globalSearch.addEventListener('input', handleSearch);

    let hintTimer = null;
    function showTransientHint(message, type) {
        let hint = document.getElementById('transientHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'transientHint';
            hint.style.cssText =
                'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
                'background:#1e3a5f;color:#fff;padding:0.7rem 1.1rem;border-radius:40px;' +
                'font-size:0.85rem;font-weight:500;box-shadow:0 10px 24px -8px rgba(0,0,0,0.35);' +
                'z-index:200;opacity:0;transition:opacity 0.25s ease;pointer-events:none;' +
                'max-width:90vw;text-align:center;';
            document.body.appendChild(hint);
        }
        if (type === 'success') hint.style.background = '#15803d';
        else if (type === 'error') hint.style.background = '#b91c1c';
        else hint.style.background = '#1e3a5f';

        hint.textContent = message;
        void hint.offsetWidth;
        hint.style.opacity = '1';

        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(function () {
            hint.style.opacity = '0';
        }, 2200);
    }

    function deleteStudent(studentId, studentName) {
        studentsData = loadDashboardStudentsData();

        const idx = studentsData.findIndex(function (s) {
            return String(s.id) === String(studentId);
        });

        if (idx === -1) {
            showTransientHint('Student not found.', 'error');
            return;
        }

        studentsData.splice(idx, 1);
        saveDashboardStudentsData(studentsData);

        renderStudents(studentsData);
        updateStudentsStat();
        showTransientHint('Student removed successfully.', 'success');
    }

    function init() {
        if (isRedirecting) return;

        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY_STUDENTS) {
                studentsData = loadDashboardStudentsData();
                renderStudents(studentsData);
                updateStudentsStat();
            }
            if (e.key === STORAGE_KEY_TEACHERS) {
                teachersData = loadDashboardTeachersData();
                updateTeachersStat();
            }
            if (e.key === STORAGE_KEY_CLASSES) {
                classesData = loadDashboardClassesData();
                updateClassesStat();
            }
            if (e.key === STORAGE_KEY_FEES) {
                feesData = loadDashboardFeesData();
                updateFeesStat();
            }
            if (e.key === STORAGE_KEY_ATTENDANCE) {
                attendanceData = loadDashboardAttendanceData();
                renderAttendanceChart();
            }
        });

        loadAdminInfo();
        renderStats();
        renderAttendanceChart();
        renderStudents(studentsData);

        renderNotifications();

        window.addEventListener('pageshow', function () {
            studentsData = loadDashboardStudentsData();
            renderStudents(studentsData);
            updateStudentsStat();
            teachersData = loadDashboardTeachersData();
            updateTeachersStat();
            classesData = loadDashboardClassesData();
            updateClassesStat();
            feesData = loadDashboardFeesData();
            updateFeesStat();
            attendanceData = loadDashboardAttendanceData();
            renderAttendanceChart();
        });
    }

    init();

})();

/* =============================================
   SUPERSEDED legacy student block — kept, skipped
   ============================================= */
(function () {
    'use strict';
    return;
})();

/* =============================================
   SUPERSEDED legacy student block #2 — kept, skipped
   ============================================= */
(function () {
    'use strict';
    return;
})();

/* =============================================
   SUPERSEDED legacy teacher block — kept, skipped
   ============================================= */
(function () {
    'use strict';
    return;
})();

/* =============================================
   SUPERSEDED legacy block — kept, skipped
   ============================================= */
(function () {
    'use strict';
    return;
})();

/* =============================================
   SUPERSEDED legacy subject block — kept, skipped
   ============================================= */
(function () {
    'use strict';
    return;
})();

/* =============================================
   SUBJECTS PAGE SPECIFIC
   ============================================= */
function initSubjects() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_SUBJECTS = 'subjectsData';
    const STORAGE_KEY_TEACHERS = 'teachersData';
    const STORAGE_KEY_CLASSES  = 'classesData';

    let isRedirecting = false;

    const SEED_SUBJECTS = [
        { id: '01', name: 'Mathematics', code: 'MATH101', className: '10th', teacher: 'Khan', status: 'Active' },
        { id: '02', name: 'English',     code: 'ENG101',  className: '9th',  teacher: 'Ali',  status: 'Active' },
        { id: '03', name: 'Physics',     code: 'PHY101',  className: '10th', teacher: 'Khan', status: 'Active' },
        { id: '04', name: 'Chemistry',   code: 'CHE101',  className: '10th', teacher: 'Khan', status: 'Active' },
        { id: '05', name: 'Computer Science', code: 'CS101', className: '10th', teacher: 'Ali', status: 'Active' },
        { id: '06', name: 'Biology',     code: 'BIO101',  className: '9th',  teacher: 'Ali',  status: 'Active' },
        { id: '07', name: 'Urdu',        code: 'URD101',  className: '9th',  teacher: 'Khan', status: 'Active' },
        { id: '08', name: 'Islamiyat',   code: 'ISL101',  className: '9th',  teacher: 'Ali',  status: 'Active' }
    ];

    const FALLBACK_CLASSES = ['5th','6th','7th','8th','9th','10th','11th','12th'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const subjectSearchInput  = document.getElementById('subjectSearchInput');
    const addSubjectBtn       = document.getElementById('addSubjectBtn');
    const subjectsTableBody   = document.getElementById('subjectsGrid');

    const subjectFormModal    = document.getElementById('subjectFormModal');
    const subjectFormTitle    = document.getElementById('subjectFormTitle');
    const subjectFormClose    = document.getElementById('subjectFormClose');
    const subjectFormCancel   = document.getElementById('subjectFormCancel');
    const subjectForm         = document.getElementById('subjectForm');
    const subjectFormSubmit   = document.getElementById('subjectFormSubmit');
    const subjectIdHidden     = document.getElementById('subjectIdHidden');

    const inputSubjectName    = document.getElementById('inputSubjectName');
    const inputSubjectCode    = document.getElementById('inputSubjectCode');
    const inputSubjectClass   = document.getElementById('inputSubjectClass');
    const inputSubjectTeacher = document.getElementById('inputSubjectTeacher');
    const inputSubjectStatus  = document.getElementById('inputSubjectStatus');

    const viewSubjectModal    = document.getElementById('viewSubjectModal');
    const viewSubjectClose    = document.getElementById('viewSubjectClose');
    const viewSubjectDone     = document.getElementById('viewSubjectDone');
    const viewSubjectDetails  = document.getElementById('viewSubjectDetails');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadSubjectsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SUBJECTS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(SEED_SUBJECTS));
                return SEED_SUBJECTS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Subjects] Storage read failed, using seed data.', e);
            return SEED_SUBJECTS.slice();
        }
    }

    function saveSubjectsToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Subjects] Storage write failed.', e);
        }
    }

    function loadTeachersFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_TEACHERS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    let subjects = loadSubjectsFromStorage();

    function subjectIconInfo(name) {
        const n = String(name || '').toLowerCase();
        if (n.indexOf('math') !== -1)    return { icon: 'fa-square-root-variable', tone: 'math' };
        if (n.indexOf('english') !== -1) return { icon: 'fa-language',             tone: 'english' };
        if (n.indexOf('physics') !== -1) return { icon: 'fa-atom',                 tone: 'physics' };
        if (n.indexOf('chem') !== -1)    return { icon: 'fa-flask',                tone: 'chemistry' };
        if (n.indexOf('comp') !== -1 ||
            n.indexOf('computer') !== -1)return { icon: 'fa-laptop-code',          tone: 'computer' };
        if (n.indexOf('bio') !== -1)     return { icon: 'fa-dna',                  tone: 'biology' };
        if (n.indexOf('urdu') !== -1)    return { icon: 'fa-book-open',            tone: 'urdu' };
        if (n.indexOf('islam') !== -1)   return { icon: 'fa-mosque',               tone: 'islamiyat' };
        if (n.indexOf('pak') !== -1)     return { icon: 'fa-flag',                 tone: 'pakistan' };
        return { icon: 'fa-book', tone: 'default' };
    }

    function nextSubjectId() {
        let maxNum = 0;
        subjects.forEach(function (s) {
            const n = parseInt(s.id, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        if (!transientHint) return;
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function subjectExists(name, code, excludeId) {
        const n = String(name).trim().toLowerCase();
        const c = String(code).trim().toLowerCase();
        return subjects.some(function (s) {
            if (excludeId && s.id === excludeId) return false;
            return String(s.name).trim().toLowerCase() === n || String(s.code).trim().toLowerCase() === c;
        });
    }

    function populateTeacherDropdown(selectedValue) {
        inputSubjectTeacher.innerHTML = '<option value="">-- Select Teacher --</option>';
        const teachers = loadTeachersFromStorage();
        let list = teachers.map(function (t) { return t.name; }).filter(Boolean);
        if (list.length === 0) list = ['Khan', 'Ali', 'Ahmad'];
        list.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputSubjectTeacher.appendChild(opt);
        });
        if (selectedValue) {
            const exists = Array.prototype.some.call(inputSubjectTeacher.options, function (o) { return o.value === selectedValue; });
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = selectedValue;
                opt.textContent = selectedValue;
                inputSubjectTeacher.appendChild(opt);
            }
            inputSubjectTeacher.value = selectedValue;
        }
    }

    function populateClassDropdown(selectedValue) {
        inputSubjectClass.innerHTML = '<option value="">-- Select Class --</option>';

        const standardClasses = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

        const storedClasses = loadClassesFromStorage();
        const seen = {};
        const uniqueStored = [];
        storedClasses.forEach(function (c) {
            const name = c && c.className ? String(c.className) : '';
            if (name && !seen[name]) { seen[name] = true; uniqueStored.push(name); }
        });

        let classes = standardClasses.slice();
        uniqueStored.forEach(function (c) {
            if (classes.indexOf(c) === -1) classes.push(c);
        });

        const classOrder = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
        classes.sort(function (a, b) {
            const indexA = classOrder.indexOf(a);
            const indexB = classOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        classes.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputSubjectClass.appendChild(opt);
        });
        if (selectedValue && classes.indexOf(selectedValue) === -1) {
            const opt = document.createElement('option');
            opt.value = selectedValue;
            opt.textContent = selectedValue;
            inputSubjectClass.appendChild(opt);
        }
        if (selectedValue) inputSubjectClass.value = selectedValue;
    }

    function renderSubjectsTable(list) {
        subjectsTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fas fa-book-open"></i>No subjects found.';
            subjectsTableBody.appendChild(empty);
            return;
        }

        list.forEach(function (subject) {
            const info = subjectIconInfo(subject.name);
            const isActive = (subject.status || 'Active') !== 'Inactive';

            const card = document.createElement('article');
            card.className = 'subject-card';

            const head = document.createElement('div');
            head.className = 'subject-card-head';

            const iconBox = document.createElement('div');
            iconBox.className = 'subject-icon tone-' + info.tone;
            iconBox.innerHTML = '<i class="fas ' + info.icon + '"></i>';

            const headText = document.createElement('div');
            headText.className = 'subject-head-text';

            const title = document.createElement('h3');
            title.className = 'subject-title';
            title.textContent = subject.name || '';

            const chips = document.createElement('div');
            chips.className = 'subject-chips';

            function addChip(cls, icon, value) {
                if (value == null || value === '') return;
                const chip = document.createElement('span');
                chip.className = 'subject-chip ' + cls;
                chip.innerHTML = '<i class="fas ' + icon + '"></i>';
                chip.appendChild(document.createTextNode(value));
                chips.appendChild(chip);
            }
            addChip('chip-code',    'fa-barcode',   subject.code);
            addChip('chip-class',   'fa-graduation-cap', subject.className);
            addChip('chip-teacher', 'fa-user-tie',  subject.teacher);

            headText.appendChild(title);
            headText.appendChild(chips);

            const statusPill = document.createElement('span');
            statusPill.className = 'subject-status-pill ' + (isActive ? 'is-active' : 'is-inactive');
            statusPill.textContent = subject.status || 'Active';

            head.appendChild(iconBox);
            head.appendChild(headText);
            head.appendChild(statusPill);

            const actions = document.createElement('div');
            actions.className = 'subject-card-actions';

            const viewBtn = document.createElement('button');
            viewBtn.type = 'button';
            viewBtn.className = 'btn-action btn-view-subject';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
            viewBtn.addEventListener('click', function () { openViewSubject(subject.id); });

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btn-action btn-edit-subject';
            editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit';
            editBtn.addEventListener('click', function () { openEditSubject(subject.id); });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-action btn-delete-subject';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.addEventListener('click', function () { handleDeleteSubject(subject.id); });

            actions.appendChild(viewBtn);
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            card.appendChild(head);
            card.appendChild(actions);
            subjectsTableBody.appendChild(card);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function handleSearch() {
        const q = subjectSearchInput.value.trim().toLowerCase();
        if (!q) {
            renderSubjectsTable(subjects);
            return;
        }
        const filtered = subjects.filter(function (s) {
            return (s.name && s.name.toLowerCase().includes(q)) ||
                   (s.code && s.code.toLowerCase().includes(q)) ||
                   (s.className && s.className.toLowerCase().includes(q)) ||
                   (s.teacher && s.teacher.toLowerCase().includes(q));
        });
        renderSubjectsTable(filtered);
    }

    if (subjectSearchInput) subjectSearchInput.addEventListener('input', handleSearch);

    function resetFormErrors() {
        document.querySelectorAll('#subjectForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#subjectForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        subjectForm.reset();
        subjectIdHidden.value = '';
        resetFormErrors();
    }

    function openAddSubject() {
        clearForm();
        populateClassDropdown(null);
        populateTeacherDropdown(null);
        inputSubjectStatus.value = 'Active';
        subjectFormTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Subject';
        subjectFormSubmit.innerHTML = '<i class="fas fa-plus"></i> Add Subject';
        openModal(subjectFormModal);
        setTimeout(function () { inputSubjectName.focus(); }, 50);
    }

    function openEditSubject(subjectId) {
        const subject = subjects.find(function (s) { return s.id === subjectId; });
        if (!subject) return;

        clearForm();
        subjectIdHidden.value = subject.id;
        inputSubjectName.value = subject.name || '';
        inputSubjectCode.value = subject.code || '';
        populateClassDropdown(subject.className || '');
        populateTeacherDropdown(subject.teacher || '');
        inputSubjectStatus.value = subject.status || 'Active';

        subjectFormTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Subject';
        subjectFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Subject';
        openModal(subjectFormModal);
        setTimeout(function () { inputSubjectName.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    function openViewSubject(subjectId) {
        const subject = subjects.find(function (s) { return String(s.id) === String(subjectId); });
        if (!subject || !viewSubjectModal) return;

        const info = subjectIconInfo(subject.name);
        const rows = [
            ['Subject Name', subject.name],
            ['Subject Code', subject.code],
            ['Assigned Class', subject.className],
            ['Assigned Teacher', subject.teacher],
            ['Status', subject.status || 'Active']
        ];

        viewSubjectDetails.innerHTML = '';
        rows.forEach(function (pair) {
            const block = document.createElement('div');
            block.className = 'detail-item';
            const label = document.createElement('span');
            label.className = 'detail-label';
            label.innerHTML = '<i class="fas ' + info.icon + '"></i> ' + pair[0];
            const value = document.createElement('span');
            value.className = 'detail-value';
            value.textContent = (pair[1] == null || pair[1] === '') ? '—' : pair[1];
            block.appendChild(label);
            block.appendChild(value);
            viewSubjectDetails.appendChild(block);
        });

        openModal(viewSubjectModal);
    }

    if (viewSubjectClose) viewSubjectClose.addEventListener('click', function () { closeModal(viewSubjectModal); });
    if (viewSubjectDone)  viewSubjectDone.addEventListener('click', function () { closeModal(viewSubjectModal); });

    if (viewSubjectModal) {
        viewSubjectModal.addEventListener('click', function (e) {
            if (e.target === viewSubjectModal) closeModal(viewSubjectModal);
        });
    }

    if (addSubjectBtn) addSubjectBtn.addEventListener('click', openAddSubject);
    if (subjectFormClose) subjectFormClose.addEventListener('click', function () { closeModal(subjectFormModal); clearForm(); });
    if (subjectFormCancel) subjectFormCancel.addEventListener('click', function () { closeModal(subjectFormModal); clearForm(); });

    if (subjectFormModal) {
        subjectFormModal.addEventListener('click', function (e) {
            if (e.target === subjectFormModal) { closeModal(subjectFormModal); clearForm(); }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (subjectFormModal && subjectFormModal.classList.contains('open')) {
            closeModal(subjectFormModal);
            clearForm();
        }
        if (viewSubjectModal && viewSubjectModal.classList.contains('open')) {
            closeModal(viewSubjectModal);
        }
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const name    = inputSubjectName.value.trim();
        const code    = inputSubjectCode.value.trim();
        const cls     = inputSubjectClass.value;
        const teacher = inputSubjectTeacher.value;
        const status  = inputSubjectStatus.value;

        if (!name) { setFieldError('inputSubjectName', 'error-subjectName', 'Please enter the subject name.'); ok = false; }
        if (!code) { setFieldError('inputSubjectCode', 'error-subjectCode', 'Please enter the subject code.'); ok = false; }
        if (!cls) { setFieldError('inputSubjectClass', 'error-subjectClass', 'Please select a class.'); ok = false; }
        if (!teacher) { setFieldError('inputSubjectTeacher', 'error-subjectTeacher', 'Please select a teacher.'); ok = false; }
        if (!status) { setFieldError('inputSubjectStatus', 'error-subjectStatus', 'Please select a status.'); ok = false; }

        if (name && code) {
            const editingId = subjectIdHidden.value;
            if (subjectExists(name, code, editingId)) {
                setFieldError('inputSubjectName', 'error-subjectName', 'This subject name or code already exists.');
                ok = false;
            }
        }

        return ok;
    }

    if (subjectForm) {
        subjectForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#subjectForm .form-field.has-error input, #subjectForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = subjectIdHidden.value;

            const record = {
                id:        editingId || nextSubjectId(),
                name:      inputSubjectName.value.trim(),
                code:      inputSubjectCode.value.trim(),
                className: inputSubjectClass.value,
                teacher:   inputSubjectTeacher.value,
                status:    inputSubjectStatus.value || 'Active'
            };

            if (editingId) {
                const idx = subjects.findIndex(function (s) { return s.id === editingId; });
                if (idx !== -1) subjects[idx] = record;
                showTransientHint('Subject updated successfully.', 'success');
            } else {
                subjects.push(record);
                showTransientHint('Subject added successfully.', 'success');
            }

            saveSubjectsToStorage(subjects);
            renderSubjectsTable(subjects);

            if (subjectSearchInput.value.trim()) handleSearch();

            closeModal(subjectFormModal);
            clearForm();
        });
    }

    function handleDeleteSubject(subjectId) {
        const subject = subjects.find(function (s) { return s.id === subjectId; });
        if (!subject) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this subject?\n\n' +
            'Name: ' + subject.name + '\n' +
            'Code: ' + subject.code
        );
        if (!confirmed) return;

        subjects = subjects.filter(function (s) { return s.id !== subjectId; });
        saveSubjectsToStorage(subjects);

        if (subjectSearchInput.value.trim()) {
            handleSearch();
        } else {
            renderSubjectsTable(subjects);
        }

        showTransientHint('Subject deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            subjectSearchInput.value = headerSearch.value;
            handleSearch();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        renderSubjectsTable(subjects);
    }

    init();
}

/* =============================================
   TEACHERS PAGE SPECIFIC
   ============================================= */
function initTeachers() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_TEACHERS = 'teachersData';
    const STORAGE_KEY_SUBJECTS = 'subjectsData';
    const STORAGE_KEY_CLASSES  = 'classesData';

    let isRedirecting = false;

    const SEED_TEACHERS = [
        {
            id: '01',
            name: 'Ahmad Khan',
            fatherName: 'Muhammad Ahmad',
            subject: 'Mathematics',
            className: '10th',
            phone: '03001234567',
            email: 'ahmad.khan@school.com',
            status: 'Active'
        },
        {
            id: '02',
            name: 'Ali Khan',
            fatherName: 'Hassan Ali',
            subject: 'English',
            className: '9th',
            phone: '03007654321',
            email: 'ali.khan@school.com',
            status: 'Active'
        },
        {
            id: '03',
            name: 'Hamza Ahmad',
            fatherName: 'Rashid Ahmad',
            subject: 'Physics',
            className: '10th',
            phone: '03005556677',
            email: 'hamza.ahmad@school.com',
            status: 'Active'
        }
    ];

    const FALLBACK_SUBJECTS = ['Math', 'English', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Urdu', 'Islamiyat'];
    const FALLBACK_CLASSES  = ['5th','6th','7th','8th','9th','10th','11th','12th'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const teacherSearchInput  = document.getElementById('teacherSearchInput');
    const addTeacherBtn       = document.getElementById('addTeacherBtn');
    const teachersTableBody   = document.getElementById('teachersTableBody');

    const teacherFormModal    = document.getElementById('teacherFormModal');
    const teacherFormTitle    = document.getElementById('teacherFormTitle');
    const teacherFormClose    = document.getElementById('teacherFormClose');
    const teacherFormCancel   = document.getElementById('teacherFormCancel');
    const teacherForm         = document.getElementById('teacherForm');
    const teacherFormSubmit   = document.getElementById('teacherFormSubmit');
    const teacherIdHidden     = document.getElementById('teacherIdHidden');

    const inputName           = document.getElementById('inputName');
    const inputFather         = document.getElementById('inputFather');
    const inputEmail          = document.getElementById('inputEmail');
    const inputPhone          = document.getElementById('inputPhone');
    const inputSubject        = document.getElementById('inputSubject');
    const inputClass          = document.getElementById('inputClass');
    const inputStatus         = document.getElementById('inputStatus');

    const viewTeacherModal    = document.getElementById('viewTeacherModal');
    const viewTeacherClose    = document.getElementById('viewTeacherClose');
    const viewTeacherDone     = document.getElementById('viewTeacherDone');
    const viewTeacherDetails  = document.getElementById('viewTeacherDetails');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadTeachersFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_TEACHERS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(SEED_TEACHERS));
                return SEED_TEACHERS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Teachers] Storage read failed, using seed data.', e);
            return SEED_TEACHERS.slice();
        }
    }

    function saveTeachersToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Teachers] Storage write failed.', e);
        }
    }

    function loadSubjectsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SUBJECTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (s) {
                if (typeof s === 'string') return s;
                return s && s.name ? s.name : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (c) {
                return c && c.className ? c.className : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    let teachers = loadTeachersFromStorage();

    function nextTeacherId() {
        let maxNum = 0;
        teachers.forEach(function (t) {
            const n = parseInt(t.id, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        if (!transientHint) return;
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function populateSubjectDropdown(selectedValue) {
        inputSubject.innerHTML = '<option value="">-- Select Subject --</option>';
        let subjects = loadSubjectsFromStorage();
        if (subjects.length === 0) subjects = FALLBACK_SUBJECTS.slice();
        if (selectedValue && subjects.indexOf(selectedValue) === -1) {
            subjects.push(selectedValue);
        }
        subjects.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputSubject.appendChild(opt);
        });
        if (selectedValue) inputSubject.value = selectedValue;
    }

    function populateClassDropdown(selectedValue) {
        inputClass.innerHTML = '<option value="">-- Select Class --</option>';

        const standardClasses = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

        let storedClasses = loadClassesFromStorage();
        const uniqueStored = [...new Set(storedClasses)];

        let classes = standardClasses.slice();
        uniqueStored.forEach(function (c) {
            if (classes.indexOf(c) === -1) classes.push(c);
        });

        const classOrder = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
        classes.sort(function (a, b) {
            const indexA = classOrder.indexOf(a);
            const indexB = classOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        if (selectedValue && classes.indexOf(selectedValue) === -1) classes.push(selectedValue);
        classes.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputClass.appendChild(opt);
        });
        if (selectedValue) inputClass.value = selectedValue;
    }

    function renderTeachersTable(list) {
        teachersTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="8" class="empty-state">' +
                '<i class="fas fa-user-slash"></i>' +
                'No teachers found.</td>';
            teachersTableBody.appendChild(tr);
            return;
        }

        list.forEach(function (teacher) {
            const tr = document.createElement('tr');

            tr.appendChild(td(teacher.id));
            tr.appendChild(td(teacher.name));
            tr.appendChild(td(teacher.subject));
            tr.appendChild(td(teacher.className || '—'));
            tr.appendChild(td(teacher.phone || '—'));
            tr.appendChild(td(teacher.email || '—'));

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'status-pill ' + (teacher.status === 'Inactive' ? 'inactive' : 'active');
            pill.textContent = teacher.status || 'Active';
            statusTd.appendChild(pill);
            tr.appendChild(statusTd);

            const actionTd = document.createElement('td');
            const actionMenu = document.createElement('div');
            actionMenu.className = 'action-menu';

            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = 'action-menu-btn';
            menuBtn.setAttribute('aria-label', 'More actions');
            menuBtn.setAttribute('aria-haspopup', 'true');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = '<i class="fas fa-ellipsis-vertical"></i>';

            const dropdown = document.createElement('div');
            dropdown.className = 'action-menu-dropdown';
            dropdown.setAttribute('role', 'menu');

            const viewItem = document.createElement('button');
            viewItem.type = 'button';
            viewItem.className = 'action-menu-item';
            viewItem.setAttribute('role', 'menuitem');
            viewItem.innerHTML = '<i class="fas fa-eye"></i> View';
            viewItem.addEventListener('click', function () {
                openViewTeacher(teacher.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const editItem = document.createElement('button');
            editItem.type = 'button';
            editItem.className = 'action-menu-item';
            editItem.setAttribute('role', 'menuitem');
            editItem.innerHTML = '<i class="fas fa-pen"></i> Edit';
            editItem.addEventListener('click', function () {
                openEditTeacher(teacher.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const deleteItem = document.createElement('button');
            deleteItem.type = 'button';
            deleteItem.className = 'action-menu-item delete';
            deleteItem.setAttribute('role', 'menuitem');
            deleteItem.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteItem.addEventListener('click', function () {
                handleDeleteTeacher(teacher.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            dropdown.appendChild(viewItem);
            dropdown.appendChild(editItem);
            dropdown.appendChild(deleteItem);

            actionMenu.appendChild(menuBtn);
            actionMenu.appendChild(dropdown);
            actionTd.appendChild(actionMenu);

            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (openDropdown) {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('show');
                        const otherBtn = openDropdown.previousElementSibling;
                        if (otherBtn && otherBtn.classList.contains('action-menu-btn')) {
                            otherBtn.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
                const isOpen = dropdown.classList.toggle('show');
                menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                if (isOpen) positionActionDropdown(dropdown, menuBtn);
            });

            tr.appendChild(actionTd);

            teachersTableBody.appendChild(tr);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function handleSearch() {
        const q = teacherSearchInput.value.trim().toLowerCase();

        if (!q) {
            renderTeachersTable(teachers);
            return;
        }

        const filtered = teachers.filter(function (t) {
            return (t.name && t.name.toLowerCase().includes(q)) ||
                   (t.subject && t.subject.toLowerCase().includes(q)) ||
                   (t.phone && String(t.phone).toLowerCase().includes(q)) ||
                   (t.className && t.className.toLowerCase().includes(q)) ||
                   (t.email && t.email.toLowerCase().includes(q)) ||
                   (t.id && String(t.id).toLowerCase().includes(q));
        });

        renderTeachersTable(filtered);
    }

    if (teacherSearchInput) teacherSearchInput.addEventListener('input', handleSearch);

    function resetFormErrors() {
        document.querySelectorAll('#teacherForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#teacherForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        teacherForm.reset();
        teacherIdHidden.value = '';
        if (inputStatus) inputStatus.value = 'Active';
        resetFormErrors();
    }

    function openAddTeacher() {
        clearForm();
        populateSubjectDropdown(null);
        populateClassDropdown(null);
        teacherFormTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add New Teacher';
        teacherFormSubmit.innerHTML = '<i class="fas fa-plus"></i> Add Teacher';
        openModal(teacherFormModal);
        setTimeout(function () { inputName.focus(); }, 50);
    }

    function openEditTeacher(teacherId) {
        const teacher = teachers.find(function (t) { return t.id === teacherId; });
        if (!teacher) return;

        clearForm();
        teacherIdHidden.value    = teacher.id;
        inputName.value          = teacher.name || '';
        inputFather.value        = teacher.fatherName || '';
        inputEmail.value         = teacher.email || '';
        inputPhone.value         = teacher.phone || '';
        populateSubjectDropdown(teacher.subject || '');
        populateClassDropdown(teacher.className || '');
        inputStatus.value        = teacher.status || 'Active';

        teacherFormTitle.innerHTML = '<i class="fas fa-user-pen"></i> Edit Teacher';
        teacherFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Teacher';
        openModal(teacherFormModal);
        setTimeout(function () { inputName.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addTeacherBtn) addTeacherBtn.addEventListener('click', openAddTeacher);
    if (teacherFormClose) teacherFormClose.addEventListener('click', function () { closeModal(teacherFormModal); clearForm(); });
    if (teacherFormCancel) teacherFormCancel.addEventListener('click', function () { closeModal(teacherFormModal); clearForm(); });

    if (teacherFormModal) {
        teacherFormModal.addEventListener('click', function (e) {
            if (e.target === teacherFormModal) { closeModal(teacherFormModal); clearForm(); }
        });
    }
    if (viewTeacherModal) {
        viewTeacherModal.addEventListener('click', function (e) {
            if (e.target === viewTeacherModal) closeModal(viewTeacherModal);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (teacherFormModal && teacherFormModal.classList.contains('open')) { closeModal(teacherFormModal); clearForm(); }
        if (viewTeacherModal && viewTeacherModal.classList.contains('open')) closeModal(viewTeacherModal);
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const name    = inputName.value.trim();
        const father  = inputFather.value.trim();
        const email   = inputEmail.value.trim();
        const phone   = inputPhone.value.trim();
        const subject = inputSubject.value;
        const cls     = inputClass.value;
        const status  = inputStatus.value;

        if (!name) { setFieldError('inputName', 'error-name', 'Please enter the teacher name.'); ok = false; }
        if (!father) { setFieldError('inputFather', 'error-father', 'Please enter the father name.'); ok = false; }

        if (!email) {
            setFieldError('inputEmail', 'error-email', 'Please enter an email.');
            ok = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            setFieldError('inputEmail', 'error-email', 'Please enter a valid email address.');
            ok = false;
        }

        if (!phone) {
            setFieldError('inputPhone', 'error-phone', 'Please enter a phone number.');
            ok = false;
        } else if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
            setFieldError('inputPhone', 'error-phone', 'Please enter a valid phone number.');
            ok = false;
        }

        if (!subject) { setFieldError('inputSubject', 'error-subject', 'Please select a subject.'); ok = false; }
        if (!cls) { setFieldError('inputClass', 'error-class', 'Please select a class.'); ok = false; }
        if (!status) { setFieldError('inputStatus', 'error-status', 'Please select a status.'); ok = false; }

        return ok;
    }

    if (teacherForm) {
        teacherForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#teacherForm .form-field.has-error input, #teacherForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = teacherIdHidden.value;

            const record = {
                id:            editingId || nextTeacherId(),
                name:          inputName.value.trim(),
                fatherName:    inputFather.value.trim(),
                email:         inputEmail.value.trim(),
                phone:         inputPhone.value.trim(),
                subject:       inputSubject.value,
                className:     inputClass.value,
                status:        inputStatus.value || 'Active'
            };

            if (editingId) {
                const idx = teachers.findIndex(function (t) { return t.id === editingId; });
                if (idx !== -1) teachers[idx] = record;
                showTransientHint('Teacher updated successfully.', 'success');
            } else {
                teachers.unshift(record);
                showTopSuccessMessage('Teacher added successfully!');
                showTransientHint('Teacher "' + record.name + '" added successfully.', 'success');
            }

            saveTeachersToStorage(teachers);
            renderTeachersTable(teachers);

            if (teacherSearchInput.value.trim()) handleSearch();

            closeModal(teacherFormModal);
            clearForm();
        });
    }

    function showTopSuccessMessage(message) {
        const container = document.getElementById('teacherSuccessMessage');
        if (!container) return;
        container.textContent = message;
        container.style.cssText = 'background:#dcfce7;color:#15803d;padding:12px 16px;border-radius:6px;margin-bottom:16px;border:1px solid #86efac;font-weight:500;';
        container.style.display = 'block';
        clearTimeout(showTopSuccessMessage._t);
        showTopSuccessMessage._t = setTimeout(function () {
            container.style.display = 'none';
        }, 4000);
    }

    function openViewTeacher(teacherId) {
        const teacher = teachers.find(function (t) { return t.id === teacherId; });
        if (!teacher) return;

        const rows = [
            ['Teacher ID',    teacher.id],
            ['Name',          teacher.name],
            ['Father Name',   teacher.fatherName],
            ['Email',         teacher.email || '—'],
            ['Phone',         teacher.phone || '—'],
            ['Subject',       teacher.subject],
            ['Class',         teacher.className || '—'],
            ['Status',        teacher.status || 'Active']
        ];

        viewTeacherDetails.innerHTML = rows.map(function (row) {
            return '' +
                '<div class="detail-item">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value">' + escapeHtml(row[1]) + '</span>' +
                '</div>';
        }).join('');

        openModal(viewTeacherModal);
    }

    if (viewTeacherClose) viewTeacherClose.addEventListener('click', function () { closeModal(viewTeacherModal); });
    if (viewTeacherDone) viewTeacherDone.addEventListener('click', function () { closeModal(viewTeacherModal); });

    function handleDeleteTeacher(teacherId) {
        const teacher = teachers.find(function (t) { return t.id === teacherId; });
        if (!teacher) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this teacher?\n\n' +
            'Name: ' + teacher.name + '\n' +
            'Subject: ' + teacher.subject
        );
        if (!confirmed) return;

        teachers = teachers.filter(function (t) { return t.id !== teacherId; });
        saveTeachersToStorage(teachers);

        if (teacherSearchInput.value.trim()) {
            handleSearch();
        } else {
            renderTeachersTable(teachers);
        }

        showTransientHint('Teacher deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            teacherSearchInput.value = headerSearch.value;
            handleSearch();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        renderTeachersTable(teachers);

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    }

    init();
}

/* =============================================
   USERS PAGE SPECIFIC
   ============================================= */
function initUsers() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_USERS = 'usersData';
    const STORAGE_KEY_CLASSES = 'classesData';

    let isRedirecting = false;

    const SEED_USERS = [
        {
            id: '01',
            name: 'Ahmad Khan',
            fatherName: 'Muhammad Ahmad',
            email: 'ahmad.khan@school.com',
            phone: '03001234567',
            role: 'Admin',
            className: '10th',
            status: 'Active'
        },
        {
            id: '02',
            name: 'Sara Ali',
            fatherName: 'Hassan Ali',
            email: 'sara.ali@school.com',
            phone: '03007654321',
            role: 'Teacher',
            className: '9th',
            status: 'Active'
        },
        {
            id: '03',
            name: 'Bilal Ahmed',
            fatherName: 'Rashid Ahmed',
            email: 'bilal.ahmed@school.com',
            phone: '03005556677',
            role: 'Student',
            className: '8th',
            status: 'Inactive'
        }
    ];

    const FALLBACK_CLASSES = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

    const sidebar          = document.getElementById('sidebar');
    const sidebarBackdrop  = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn    = document.getElementById('mobileMenuBtn');
    const logoutBtn        = document.getElementById('logoutBtn');
    const notificationBtn  = document.getElementById('notificationBtn');
    const adminAvatar      = document.getElementById('adminAvatar');
    const adminName        = document.getElementById('adminName');

    const userSearchInput  = document.getElementById('userSearchInput');
    const addUserBtn       = document.getElementById('addUserBtn');
    const usersTableBody   = document.getElementById('usersTableBody');

    const userFormModal    = document.getElementById('userFormModal');
    const userFormTitle    = document.getElementById('userFormTitle');
    const userFormClose    = document.getElementById('userFormClose');
    const userFormCancel   = document.getElementById('userFormCancel');
    const userForm         = document.getElementById('userForm');
    const userFormSubmit   = document.getElementById('userFormSubmit');

    const inputName        = document.getElementById('userInputName');
    const inputFather      = document.getElementById('userInputFather');
    const inputEmail       = document.getElementById('userInputEmail');
    const inputPhone       = document.getElementById('userInputPhone');
    const inputRole        = document.getElementById('userInputRole');
    const inputClass       = document.getElementById('userInputClass');
    const inputStatus      = document.getElementById('userInputStatus');

    const viewUserModal    = document.getElementById('viewUserModal');
    const viewUserClose    = document.getElementById('viewUserClose');
    const viewUserDone     = document.getElementById('viewUserDone');
    const viewUserDetails  = document.getElementById('viewUserDetails');

    const transientHint    = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadUsersFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USERS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEED_USERS));
                return SEED_USERS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Users] Storage read failed, using seed data.', e);
            return SEED_USERS.slice();
        }
    }

    function saveUsersToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Users] Storage write failed.', e);
        }
    }

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (c) {
                return c && c.className ? c.className : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    let users = loadUsersFromStorage();

    function nextUserId() {
        let maxNum = 0;
        users.forEach(function (u) {
            const n = parseInt(u.id, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        if (!transientHint) return;
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function populateClassDropdown(selectedValue) {
        inputClass.innerHTML = '<option value="">-- Select Class --</option>';

        const standardClasses = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

        let storedClasses = loadClassesFromStorage();
        const uniqueStored = [...new Set(storedClasses)];

        let classes = standardClasses.slice();
        uniqueStored.forEach(function (c) {
            if (classes.indexOf(c) === -1) classes.push(c);
        });

        const classOrder = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
        classes.sort(function (a, b) {
            const indexA = classOrder.indexOf(a);
            const indexB = classOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        if (selectedValue && classes.indexOf(selectedValue) === -1) classes.push(selectedValue);
        classes.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputClass.appendChild(opt);
        });
        if (selectedValue) inputClass.value = selectedValue;
    }

    function renderUsersTable(list) {
        usersTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="9" class="empty-state">' +
                '<i class="fas fa-user-slash"></i>' +
                'No users found.</td>';
            usersTableBody.appendChild(tr);
            return;
        }

        list.forEach(function (user) {
            const tr = document.createElement('tr');

            tr.appendChild(td(user.id));
            tr.appendChild(td(user.name));
            tr.appendChild(td(user.fatherName));
            tr.appendChild(td(user.email || '—'));
            tr.appendChild(td(user.phone || '—'));
            tr.appendChild(td(user.role || '—'));
            tr.appendChild(td(user.className || '—'));

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'status-pill ' + (user.status === 'Inactive' ? 'inactive' : 'active');
            pill.textContent = user.status || 'Active';
            statusTd.appendChild(pill);
            tr.appendChild(statusTd);

            const actionTd = document.createElement('td');
            const actionMenu = document.createElement('div');
            actionMenu.className = 'action-menu';

            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = 'action-menu-btn';
            menuBtn.setAttribute('aria-label', 'More actions');
            menuBtn.setAttribute('aria-haspopup', 'true');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = '<i class="fas fa-ellipsis-vertical"></i>';

            const dropdown = document.createElement('div');
            dropdown.className = 'action-menu-dropdown';
            dropdown.setAttribute('role', 'menu');

            const viewItem = document.createElement('button');
            viewItem.type = 'button';
            viewItem.className = 'action-menu-item';
            viewItem.setAttribute('role', 'menuitem');
            viewItem.innerHTML = '<i class="fas fa-eye"></i> View';
            viewItem.addEventListener('click', function () {
                openViewUser(user.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const deleteItem = document.createElement('button');
            deleteItem.type = 'button';
            deleteItem.className = 'action-menu-item delete';
            deleteItem.setAttribute('role', 'menuitem');
            deleteItem.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteItem.addEventListener('click', function () {
                handleDeleteUser(user.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            dropdown.appendChild(viewItem);
            dropdown.appendChild(deleteItem);

            actionMenu.appendChild(menuBtn);
            actionMenu.appendChild(dropdown);
            actionTd.appendChild(actionMenu);

            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (openDropdown) {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('show');
                        const otherBtn = openDropdown.previousElementSibling;
                        if (otherBtn && otherBtn.classList.contains('action-menu-btn')) {
                            otherBtn.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
                const isOpen = dropdown.classList.toggle('show');
                menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                if (isOpen) positionActionDropdown(dropdown, menuBtn);
            });

            tr.appendChild(actionTd);

            usersTableBody.appendChild(tr);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function handleSearch() {
        const q = userSearchInput.value.trim().toLowerCase();

        if (!q) {
            renderUsersTable(users);
            return;
        }

        const filtered = users.filter(function (u) {
            return (u.name && u.name.toLowerCase().includes(q)) ||
                   (u.fatherName && u.fatherName.toLowerCase().includes(q)) ||
                   (u.email && u.email.toLowerCase().includes(q)) ||
                   (u.phone && String(u.phone).toLowerCase().includes(q)) ||
                   (u.role && u.role.toLowerCase().includes(q)) ||
                   (u.className && u.className.toLowerCase().includes(q)) ||
                   (u.status && u.status.toLowerCase().includes(q)) ||
                   (u.id && String(u.id).toLowerCase().includes(q));
        });

        renderUsersTable(filtered);
    }

    if (userSearchInput) userSearchInput.addEventListener('input', handleSearch);

    function resetFormErrors() {
        document.querySelectorAll('#userForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#userForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        userForm.reset();
        if (inputStatus) inputStatus.value = 'Active';
        resetFormErrors();
    }

    function openAddUser() {
        clearForm();
        populateClassDropdown(null);
        userFormTitle.textContent = 'Add New User';
        userFormSubmit.innerHTML = '<i class="fas fa-plus"></i> Add User';
        openModal(userFormModal);
        setTimeout(function () { inputName.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addUserBtn) addUserBtn.addEventListener('click', openAddUser);
    if (userFormClose) userFormClose.addEventListener('click', function () { closeModal(userFormModal); clearForm(); });
    if (userFormCancel) userFormCancel.addEventListener('click', function () { closeModal(userFormModal); clearForm(); });

    if (userFormModal) {
        userFormModal.addEventListener('click', function (e) {
            if (e.target === userFormModal) { closeModal(userFormModal); clearForm(); }
        });
    }
    if (viewUserModal) {
        viewUserModal.addEventListener('click', function (e) {
            if (e.target === viewUserModal) closeModal(viewUserModal);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (userFormModal && userFormModal.classList.contains('open')) { closeModal(userFormModal); clearForm(); }
        if (viewUserModal && viewUserModal.classList.contains('open')) closeModal(viewUserModal);
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const name    = inputName.value.trim();
        const father  = inputFather.value.trim();
        const email   = inputEmail.value.trim();
        const phone   = inputPhone.value.trim();
        const role    = inputRole.value;
        const cls     = inputClass.value;
        const status  = inputStatus.value;

        if (!name) { setFieldError('userInputName', 'error-user-name', 'Please enter the user name.'); ok = false; }
        if (!father) { setFieldError('userInputFather', 'error-user-father', 'Please enter the father name.'); ok = false; }

        if (!email) {
            setFieldError('userInputEmail', 'error-user-email', 'Please enter an email.');
            ok = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            setFieldError('userInputEmail', 'error-user-email', 'Please enter a valid email address.');
            ok = false;
        }

        if (!phone) {
            setFieldError('userInputPhone', 'error-user-phone', 'Please enter a phone number.');
            ok = false;
        } else if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
            setFieldError('userInputPhone', 'error-user-phone', 'Please enter a valid phone number.');
            ok = false;
        }

        if (!role) { setFieldError('userInputRole', 'error-user-role', 'Please select a role.'); ok = false; }
        if (!cls) { setFieldError('userInputClass', 'error-user-class', 'Please select a class.'); ok = false; }
        if (!status) { setFieldError('userInputStatus', 'error-user-status', 'Please select a status.'); ok = false; }

        return ok;
    }

    if (userForm) {
        userForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#userForm .form-field.has-error input, #userForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const record = {
                id:         nextUserId(),
                name:       inputName.value.trim(),
                fatherName: inputFather.value.trim(),
                email:      inputEmail.value.trim(),
                phone:      inputPhone.value.trim(),
                role:       inputRole.value,
                className:  inputClass.value,
                status:     inputStatus.value || 'Active'
            };

            users.push(record);
            saveUsersToStorage(users);
            renderUsersTable(users);

            if (userSearchInput.value.trim()) handleSearch();

            closeModal(userFormModal);
            clearForm();
            showTransientHint('User Added Successfully!', 'success');
        });
    }

    function openViewUser(userId) {
        const user = users.find(function (u) { return u.id === userId; });
        if (!user) return;

        const rows = [
            ['User ID',     user.id],
            ['User Name',   user.name],
            ['Father Name', user.fatherName],
            ['Email',       user.email || '—'],
            ['Phone',       user.phone || '—'],
            ['Role',        user.role || '—'],
            ['Class',       user.className || '—'],
            ['Status',      user.status || 'Active']
        ];

        viewUserDetails.innerHTML = rows.map(function (row) {
            return '' +
                '<div class="detail-item">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value">' + escapeHtml(row[1]) + '</span>' +
                '</div>';
        }).join('');

        openModal(viewUserModal);
    }

    if (viewUserClose) viewUserClose.addEventListener('click', function () { closeModal(viewUserModal); });
    if (viewUserDone) viewUserDone.addEventListener('click', function () { closeModal(viewUserModal); });

    function handleDeleteUser(userId) {
        const user = users.find(function (u) { return u.id === userId; });
        if (!user) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this user?\n\n' +
            'Name: ' + user.name + '\n' +
            'Role: ' + user.role
        );
        if (!confirmed) return;

        users = users.filter(function (u) { return u.id !== userId; });
        saveUsersToStorage(users);

        if (userSearchInput.value.trim()) {
            handleSearch();
        } else {
            renderUsersTable(users);
        }

        showTransientHint('User deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            userSearchInput.value = headerSearch.value;
            handleSearch();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        renderUsersTable(users);

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    }

    init();
}

/* =============================================
   CLASSES PAGE SPECIFIC
   ============================================= */
function initClasses() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_CLASSES = 'classesData';
    const STORAGE_KEY_STUDENTS = 'studentsData';
    const STORAGE_KEY_TEACHERS = 'teachersData';

    let isRedirecting = false;

    const SEED_CLASSES = [
        { id: '01', className: '5th',  section: 'A', teacher: '', studentCount: 0, status: 'Active' },
        { id: '02', className: '6th',  section: 'A', teacher: '', studentCount: 0, status: 'Active' },
        { id: '03', className: '7th',  section: 'A', teacher: '', studentCount: 0, status: 'Active' },
        { id: '04', className: '8th',  section: 'A', teacher: 'Hamza Ahmad', studentCount: 32, status: 'Active' },
        { id: '05', className: '9th',  section: 'B', teacher: 'Ali Khan',   studentCount: 40, status: 'Active' },
        { id: '06', className: '10th', section: 'A', teacher: 'Ahmad Khan', studentCount: 35, status: 'Active' },
        { id: '07', className: '11th', section: 'A', teacher: '', studentCount: 0, status: 'Active' },
        { id: '08', className: '12th', section: 'A', teacher: '', studentCount: 0, status: 'Active' }
    ];

    const FALLBACK_TEACHERS = ['Ahmad Khan', 'Ali Khan', 'Hamza Ahmad'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const classSearchInput    = document.getElementById('classSearchInput');
    const addClassBtn         = document.getElementById('addClassBtn');
    const classesTableBody    = document.getElementById('classesTableBody');

    const classFormModal      = document.getElementById('classFormModal');
    const classFormTitle      = document.getElementById('classFormTitle');
    const classFormClose      = document.getElementById('classFormClose');
    const classFormCancel     = document.getElementById('classFormCancel');
    const classForm           = document.getElementById('classForm');
    const classFormSubmit     = document.getElementById('classFormSubmit');
    const classIdHidden       = document.getElementById('classIdHidden');

    const inputClassName      = document.getElementById('inputClassName');
    const inputSection        = document.getElementById('inputSection');
    const inputTeacher        = document.getElementById('inputTeacher');
    const inputStudentCount   = document.getElementById('inputStudentCount');
    const inputStatus         = document.getElementById('inputStatus');

    const viewClassModal      = document.getElementById('viewClassModal');
    const viewClassClose      = document.getElementById('viewClassClose');
    const viewClassDone       = document.getElementById('viewClassDone');
    const viewClassDetails    = document.getElementById('viewClassDetails');
    const viewClassStudentsWrap = document.getElementById('viewClassStudentsWrap');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(SEED_CLASSES));
                return SEED_CLASSES.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Classes] Storage read failed, using seed data.', e);
            return SEED_CLASSES.slice();
        }
    }

    function saveClassesToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(list));
        } catch (e) {
            console.warn('[Classes] Storage write failed.', e);
        }
    }

    function loadStudentsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function loadTeachersFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_TEACHERS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    let classes = loadClassesFromStorage();

    function nextClassId() {
        let maxNum = 0;
        classes.forEach(function (c) {
            const n = parseInt(c.id, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function countStudentsForClass(className, section) {
        const students = loadStudentsFromStorage();
        if (!students.length) return 0;
        return students.filter(function (s) {
            if (!s.className) return false;
            if (String(s.className) !== String(className)) return false;
            if (s.section != null && String(s.section).length) {
                return String(s.section) === String(section);
            }
            return true;
        }).length;
    }

    function getStudentsForClass(className, section) {
        const students = loadStudentsFromStorage();
        if (!students.length) return [];
        return students.filter(function (s) {
            if (!s.className) return false;
            if (String(s.className) !== String(className)) return false;
            if (s.section != null && String(s.section).length) {
                return String(s.section) === String(section);
            }
            return true;
        });
    }

    function populateTeacherDropdown(selectedName) {
        inputTeacher.innerHTML = '<option value="">-- Select Teacher --</option>';
        const teachers = loadTeachersFromStorage();
        let list = teachers.map(function (t) { return t.name; }).filter(Boolean);
        if (list.length === 0) list = FALLBACK_TEACHERS.slice();

        if (selectedName && list.indexOf(selectedName) === -1) {
            list.push(selectedName);
        }

        list.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputTeacher.appendChild(opt);
        });

        if (selectedName) inputTeacher.value = selectedName;
    }

    function renderClassesTable(list) {
        classesTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="empty-state">' +
                '<i class="fas fa-school"></i>' +
                'No classes found.</td>';
            classesTableBody.appendChild(tr);
            return;
        }

        list.forEach(function (cls) {
            const tr = document.createElement('tr');

            tr.appendChild(td(cls.className));
            tr.appendChild(td(cls.section));

            const liveCount = countStudentsForClass(cls.className, cls.section);
            const displayCount = liveCount > 0 ? liveCount : (cls.studentCount || 0);

            tr.appendChild(td(cls.teacher || '—'));
            tr.appendChild(td(displayCount));

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'status-pill ' + (cls.status === 'Inactive' ? 'inactive' : 'active');
            pill.textContent = cls.status || 'Active';
            statusTd.appendChild(pill);
            tr.appendChild(statusTd);

            const actionTd = document.createElement('td');
            const actionMenu = document.createElement('div');
            actionMenu.className = 'action-menu';

            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = 'action-menu-btn';
            menuBtn.setAttribute('aria-label', 'More actions');
            menuBtn.setAttribute('aria-haspopup', 'true');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = '⋮';

            const dropdown = document.createElement('div');
            dropdown.className = 'action-menu-dropdown';
            dropdown.setAttribute('role', 'menu');

            const viewItem = document.createElement('button');
            viewItem.type = 'button';
            viewItem.className = 'action-menu-item';
            viewItem.setAttribute('role', 'menuitem');
            viewItem.innerHTML = '<i class="fas fa-eye"></i> View';
            viewItem.addEventListener('click', function () {
                openViewClass(cls.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const editItem = document.createElement('button');
            editItem.type = 'button';
            editItem.className = 'action-menu-item';
            editItem.setAttribute('role', 'menuitem');
            editItem.innerHTML = '<i class="fas fa-pen"></i> Edit';
            editItem.addEventListener('click', function () {
                openEditClass(cls.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            dropdown.appendChild(viewItem);
            dropdown.appendChild(editItem);

            actionMenu.appendChild(menuBtn);
            actionMenu.appendChild(dropdown);
            actionTd.appendChild(actionMenu);

            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (openDropdown) {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('show');
                        const otherBtn = openDropdown.previousElementSibling;
                        if (otherBtn && otherBtn.classList.contains('action-menu-btn')) {
                            otherBtn.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
                const isOpen = dropdown.classList.toggle('show');
                menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                if (isOpen) positionActionDropdown(dropdown, menuBtn);
            });

            tr.appendChild(actionTd);

            classesTableBody.appendChild(tr);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function handleSearch() {
        const q = classSearchInput.value.trim().toLowerCase();

        if (!q) {
            renderClassesTable(classes);
            return;
        }

        const filtered = classes.filter(function (c) {
            return (c.className && c.className.toLowerCase().includes(q)) ||
                   (c.section && String(c.section).toLowerCase().includes(q)) ||
                   (c.teacher && c.teacher.toLowerCase().includes(q));
        });

        renderClassesTable(filtered);
    }

    if (classSearchInput) classSearchInput.addEventListener('input', handleSearch);

    function classExists(className, section, excludeId) {
        return classes.some(function (c) {
            if (excludeId && c.id === excludeId) return false;
            return String(c.className) === String(className) &&
                   String(c.section) === String(section);
        });
    }

    function resetFormErrors() {
        document.querySelectorAll('#classForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#classForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        classForm.reset();
        classIdHidden.value = '';
        if (inputStatus) inputStatus.value = 'Active';
        resetFormErrors();
    }

    function openAddClass() {
        clearForm();
        populateTeacherDropdown(null);
        classFormTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Class';
        classFormSubmit.innerHTML = '<i class="fas fa-plus"></i> Add Class';
        openModal(classFormModal);
        setTimeout(function () { inputClassName.focus(); }, 50);
    }

    function openEditClass(classId) {
        const cls = classes.find(function (c) { return c.id === classId; });
        if (!cls) return;

        clearForm();
        classIdHidden.value     = cls.id;
        inputClassName.value    = cls.className || '';
        inputSection.value      = cls.section || '';
        populateTeacherDropdown(cls.teacher || '');
        inputStudentCount.value = cls.studentCount || 0;
        inputStatus.value       = cls.status || 'Active';

        classFormTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Class';
        classFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Class';
        openModal(classFormModal);
        setTimeout(function () { inputClassName.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addClassBtn) addClassBtn.addEventListener('click', openAddClass);
    if (classFormClose) classFormClose.addEventListener('click', function () { closeModal(classFormModal); clearForm(); });
    if (classFormCancel) classFormCancel.addEventListener('click', function () { closeModal(classFormModal); clearForm(); });

    if (classFormModal) {
        classFormModal.addEventListener('click', function (e) {
            if (e.target === classFormModal) { closeModal(classFormModal); clearForm(); }
        });
    }
    if (viewClassModal) {
        viewClassModal.addEventListener('click', function (e) {
            if (e.target === viewClassModal) closeModal(viewClassModal);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (classFormModal && classFormModal.classList.contains('open')) { closeModal(classFormModal); clearForm(); }
        if (viewClassModal && viewClassModal.classList.contains('open')) closeModal(viewClassModal);
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const className    = inputClassName.value;
        const section      = inputSection.value;
        const teacher      = inputTeacher.value;
        const studentCount = inputStudentCount.value;
        const status       = inputStatus.value;

        if (!className) { setFieldError('inputClassName', 'error-className', 'Please select a class.'); ok = false; }
        if (!section) { setFieldError('inputSection', 'error-section', 'Please select a section.'); ok = false; }
        if (!teacher) { setFieldError('inputTeacher', 'error-teacher', 'Please select a teacher.'); ok = false; }

        if (studentCount === '' || studentCount == null) {
            setFieldError('inputStudentCount', 'error-studentCount', 'Please enter the number of students.');
            ok = false;
        } else if (isNaN(Number(studentCount)) || Number(studentCount) < 0) {
            setFieldError('inputStudentCount', 'error-studentCount', 'Please enter a valid number.');
            ok = false;
        }

        if (!status) { setFieldError('inputStatus', 'error-status', 'Please select a status.'); ok = false; }

        if (className && section) {
            const editingId = classIdHidden.value;
            if (classExists(className, section, editingId)) {
                setFieldError('inputClassName', 'error-className', 'This class and section already exists.');
                ok = false;
            }
        }

        return ok;
    }

    if (classForm) {
        classForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#classForm .form-field.has-error input, #classForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = classIdHidden.value;

            const record = {
                id:           editingId || nextClassId(),
                className:    inputClassName.value,
                section:      inputSection.value,
                teacher:      inputTeacher.value,
                studentCount: Number(inputStudentCount.value) || 0,
                status:       inputStatus.value || 'Active'
            };

            if (editingId) {
                const idx = classes.findIndex(function (c) { return c.id === editingId; });
                if (idx !== -1) classes[idx] = record;
                showTransientHint('Class updated successfully.', 'success');
            } else {
                classes.push(record);
                showTransientHint('Class added successfully.', 'success');
            }

            saveClassesToStorage(classes);
            renderClassesTable(classes);

            if (classSearchInput.value.trim()) handleSearch();

            closeModal(classFormModal);
            clearForm();
        });
    }

    function openViewClass(classId) {
        const cls = classes.find(function (c) { return c.id === classId; });
        if (!cls) return;

        const liveCount = countStudentsForClass(cls.className, cls.section);
        const displayCount = liveCount > 0 ? liveCount : (cls.studentCount || 0);

        const rows = [
            ['Class',            cls.className],
            ['Section',          cls.section],
            ['Class Teacher',    cls.teacher || '—'],
            ['Number of Students', displayCount],
            ['Status',           cls.status || 'Active']
        ];

        viewClassDetails.innerHTML = rows.map(function (row) {
            return '' +
                '<div class="detail-item">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value">' + escapeHtml(row[1]) + '</span>' +
                '</div>';
        }).join('');

        const studentsInClass = getStudentsForClass(cls.className, cls.section);

        if (studentsInClass.length === 0) {
            viewClassStudentsWrap.innerHTML =
                '<div class="class-students-heading"><i class="fas fa-user-graduate"></i> ' +
                'Students in ' + escapeHtml(cls.className) + ' - Section ' + escapeHtml(cls.section) +
                '</div>' +
                '<div class="class-students-empty">No students assigned to this class yet.</div>';
        } else {
            const rowsHtml = studentsInClass.map(function (s) {
                return '' +
                    '<div class="class-student-row">' +
                    '<span class="student-id">' + escapeHtml(s.id || '—') + '</span>' +
                    '<span class="student-name">' + escapeHtml(s.name || '—') + '</span>' +
                    '</div>';
            }).join('');

            viewClassStudentsWrap.innerHTML =
                '<div class="class-students-heading"><i class="fas fa-user-graduate"></i> ' +
                'Students in ' + escapeHtml(cls.className) + ' - Section ' + escapeHtml(cls.section) +
                '</div>' +
                '<div class="class-students-list">' + rowsHtml + '</div>';
        }

        openModal(viewClassModal);
    }

    if (viewClassClose) viewClassClose.addEventListener('click', function () { closeModal(viewClassModal); });
    if (viewClassDone) viewClassDone.addEventListener('click', function () { closeModal(viewClassModal); });

    function handleDeleteClass(classId) {
        const cls = classes.find(function (c) { return c.id === classId; });
        if (!cls) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this class?\n\n' +
            'Class: ' + cls.className + '\n' +
            'Section: ' + cls.section + '\n' +
            'Teacher: ' + (cls.teacher || '—')
        );
        if (!confirmed) return;

        classes = classes.filter(function (c) { return c.id !== classId; });
        saveClassesToStorage(classes);

        if (classSearchInput.value.trim()) {
            handleSearch();
        } else {
            renderClassesTable(classes);
        }

        showTransientHint('Class deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            classSearchInput.value = headerSearch.value;
            handleSearch();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        renderClassesTable(classes);

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    }

    init();
}

/* =============================================
   EXAMS PAGE SPECIFIC
   ============================================= */
function initExams() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_EXAMS = 'examsData';
    const STORAGE_KEY_CLASSES  = 'classesData';
    const STORAGE_KEY_SUBJECTS = 'subjectsData';

    let isRedirecting = false;

    const SEED_EXAMS = [
        {
            id: '01',
            examName: 'Mid Term Examination',
            className: '10th',
            subject: 'Mathematics',
            date: '2026-09-28',
            status: 'Scheduled'
        }
    ];

    const FALLBACK_CLASSES = ['5th','6th','7th','8th','9th','10th','11th','12th'];
    const FALLBACK_SUBJECTS = ['Math', 'English', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Urdu', 'Islamiyat'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const examSearchInput     = document.getElementById('examSearchInput');
    const addExamBtn          = document.getElementById('addExamBtn');
    const examsTableBody      = document.getElementById('examsTableBody');

    const examFormModal       = document.getElementById('examFormModal');
    const examFormTitle       = document.getElementById('examFormTitle');
    const examFormClose       = document.getElementById('examFormClose');
    const examFormCancel      = document.getElementById('examFormCancel');
    const examForm            = document.getElementById('examForm');
    const examFormSubmit      = document.getElementById('examFormSubmit');
    const examIdHidden        = document.getElementById('examIdHidden');

    const inputExamName       = document.getElementById('inputExamName');
    const inputExamClass      = document.getElementById('inputExamClass');
    const inputExamSubject    = document.getElementById('inputExamSubject');
    const inputExamDate       = document.getElementById('inputExamDate');
    const inputExamStatus     = document.getElementById('inputExamStatus');

    const viewExamModal       = document.getElementById('viewExamModal');
    const viewExamClose       = document.getElementById('viewExamClose');
    const viewExamDone        = document.getElementById('viewExamDone');
    const viewExamDetails     = document.getElementById('viewExamDetails');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadExamsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_EXAMS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(SEED_EXAMS));
                return SEED_EXAMS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Exams] Storage read failed, using seed data.', e);
            return SEED_EXAMS.slice();
        }
    }

    function saveExamsToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Exams] Storage write failed.', e);
        }
    }

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (c) {
                return c && c.className ? c.className : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    function loadSubjectsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SUBJECTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (s) {
                if (typeof s === 'string') return s;
                return s && s.name ? s.name : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    let exams = loadExamsFromStorage();

    function nextExamId() {
        let maxNum = 0;
        exams.forEach(function (e) {
            const n = parseInt(e.id, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function todayISO() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
    }

    function formatDisplayDate(iso) {
        if (!iso) return '—';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function populateClassDropdown(selectedValue) {
        inputExamClass.innerHTML = '<option value="">-- Select Class --</option>';

        const standardClasses = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

        let storedClasses = loadClassesFromStorage();
        const uniqueStored = [...new Set(storedClasses)];

        let classes = standardClasses.slice();
        uniqueStored.forEach(function (c) {
            if (classes.indexOf(c) === -1) classes.push(c);
        });

        const classOrder = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
        classes.sort(function (a, b) {
            const indexA = classOrder.indexOf(a);
            const indexB = classOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        if (selectedValue && classes.indexOf(selectedValue) === -1) classes.push(selectedValue);
        classes.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputExamClass.appendChild(opt);
        });
        if (selectedValue) inputExamClass.value = selectedValue;
    }

    function populateSubjectDropdown(selectedValue) {
        inputExamSubject.innerHTML = '<option value="">-- Select Subject --</option>';
        let subjects = loadSubjectsFromStorage();
        if (subjects.length === 0) subjects = FALLBACK_SUBJECTS.slice();
        if (selectedValue && subjects.indexOf(selectedValue) === -1) {
            subjects.push(selectedValue);
        }
        subjects.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputExamSubject.appendChild(opt);
        });
        if (selectedValue) inputExamSubject.value = selectedValue;
    }

    function renderExamsTable(list) {
        examsTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="empty-state">' +
                '<i class="fas fa-file-circle-xmark"></i>' +
                'No exams found.</td>';
            examsTableBody.appendChild(tr);
            return;
        }

        list.forEach(function (exam) {
            const tr = document.createElement('tr');

            tr.appendChild(td(exam.examName));
            tr.appendChild(td(exam.className));
            tr.appendChild(td(exam.subject));
            tr.appendChild(td(formatDisplayDate(exam.date)));

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            const statusClass = (exam.status || 'Scheduled').toLowerCase();
            pill.className = 'status-pill ' + statusClass;
            pill.textContent = exam.status || 'Scheduled';
            statusTd.appendChild(pill);
            tr.appendChild(statusTd);

            const actionTd = document.createElement('td');
            const wrap = document.createElement('div');
            wrap.className = 'row-actions';

            const viewBtn = document.createElement('button');
            viewBtn.type = 'button';
            viewBtn.className = 'btn-action btn-view-exam';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
            viewBtn.addEventListener('click', function () { openViewExam(exam.id); });

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btn-action btn-edit-exam';
            editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit';
            editBtn.addEventListener('click', function () { openEditExam(exam.id); });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-action btn-delete-exam';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.addEventListener('click', function () { handleDeleteExam(exam.id); });

            wrap.appendChild(viewBtn);
            wrap.appendChild(editBtn);
            wrap.appendChild(deleteBtn);
            actionTd.appendChild(wrap);
            tr.appendChild(actionTd);

            examsTableBody.appendChild(tr);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function handleSearch() {
        const q = examSearchInput.value.trim().toLowerCase();

        if (!q) {
            renderExamsTable(exams);
            return;
        }

        const filtered = exams.filter(function (e) {
            return (e.examName && e.examName.toLowerCase().includes(q)) ||
                   (e.className && String(e.className).toLowerCase().includes(q)) ||
                   (e.subject && e.subject.toLowerCase().includes(q)) ||
                   (e.status && e.status.toLowerCase().includes(q)) ||
                   (e.date && String(e.date).toLowerCase().includes(q)) ||
                   (e.id && String(e.id).toLowerCase().includes(q));
        });

        renderExamsTable(filtered);
    }

    if (examSearchInput) examSearchInput.addEventListener('input', handleSearch);

    function examExists(examName, className, subject, date, excludeId) {
        const n = String(examName).trim().toLowerCase();
        const c = String(className);
        const s = String(subject);
        const d = String(date);

        return exams.some(function (e) {
            if (excludeId && e.id === excludeId) return false;
            return String(e.examName).trim().toLowerCase() === n &&
                   String(e.className) === c &&
                   String(e.subject)  === s &&
                   String(e.date)     === d;
        });
    }

    function resetFormErrors() {
        document.querySelectorAll('#examForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#examForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        examForm.reset();
        examIdHidden.value = '';
        inputExamDate.value = todayISO();
        resetFormErrors();
    }

    function openCreateExam() {
        clearForm();
        populateClassDropdown(null);
        populateSubjectDropdown(null);
        examFormTitle.innerHTML = '<i class="fas fa-plus"></i> Create New Exam';
        examFormSubmit.innerHTML = '<i class="fas fa-plus"></i> Create Exam';
        openModal(examFormModal);
        setTimeout(function () { inputExamName.focus(); }, 50);
    }

    function openEditExam(examId) {
        const exam = exams.find(function (e) { return e.id === examId; });
        if (!exam) return;

        clearForm();
        examIdHidden.value = exam.id;
        inputExamName.value = exam.examName || '';
        populateClassDropdown(exam.className || '');
        populateSubjectDropdown(exam.subject || '');
        inputExamDate.value = exam.date || todayISO();
        inputExamStatus.value = exam.status || 'Scheduled';

        examFormTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Exam';
        examFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Exam';
        openModal(examFormModal);
        setTimeout(function () { inputExamName.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addExamBtn) addExamBtn.addEventListener('click', openCreateExam);
    if (examFormClose) examFormClose.addEventListener('click', function () { closeModal(examFormModal); clearForm(); });
    if (examFormCancel) examFormCancel.addEventListener('click', function () { closeModal(examFormModal); clearForm(); });

    if (examFormModal) {
        examFormModal.addEventListener('click', function (e) {
            if (e.target === examFormModal) { closeModal(examFormModal); clearForm(); }
        });
    }
    if (viewExamModal) {
        viewExamModal.addEventListener('click', function (e) {
            if (e.target === viewExamModal) closeModal(viewExamModal);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (examFormModal && examFormModal.classList.contains('open')) { closeModal(examFormModal); clearForm(); }
        if (viewExamModal && viewExamModal.classList.contains('open')) closeModal(viewExamModal);
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const name    = inputExamName.value.trim();
        const cls     = inputExamClass.value;
        const subject = inputExamSubject.value;
        const date    = inputExamDate.value;
        const status  = inputExamStatus.value;

        if (!name) { setFieldError('inputExamName', 'error-examName', 'Exam name is required.'); ok = false; }
        if (!cls) { setFieldError('inputExamClass', 'error-className', 'Please select a class.'); ok = false; }
        if (!subject) { setFieldError('inputExamSubject', 'error-subject', 'Please select a subject.'); ok = false; }
        if (!date) { setFieldError('inputExamDate', 'error-date', 'Please select an exam date.'); ok = false; }
        if (!status) { setFieldError('inputExamStatus', 'error-status', 'Please select a status.'); ok = false; }

        if (name && cls && subject && date) {
            const editingId = examIdHidden.value;
            if (examExists(name, cls, subject, date, editingId)) {
                setFieldError('inputExamName', 'error-examName', 'This exam already exists for the selected class, subject, and date.');
                ok = false;
            }
        }

        return ok;
    }

    if (examForm) {
        examForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#examForm .form-field.has-error input, #examForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = examIdHidden.value;

            const record = {
                id:        editingId || nextExamId(),
                examName:  inputExamName.value.trim(),
                className: inputExamClass.value,
                subject:   inputExamSubject.value,
                date:      inputExamDate.value,
                status:    inputExamStatus.value || 'Scheduled'
            };

            if (editingId) {
                const idx = exams.findIndex(function (e) { return e.id === editingId; });
                if (idx !== -1) exams[idx] = record;
                showTransientHint('Exam updated successfully.', 'success');
            } else {
                exams.push(record);
                showTransientHint('Exam created successfully.', 'success');
            }

            saveExamsToStorage(exams);
            renderExamsTable(exams);

            if (examSearchInput.value.trim()) handleSearch();

            closeModal(examFormModal);
            clearForm();
        });
    }

    function openViewExam(examId) {
        const exam = exams.find(function (e) { return e.id === examId; });
        if (!exam) return;

        const rows = [
            ['Exam ID',   exam.id],
            ['Exam Name', exam.examName],
            ['Class',     exam.className],
            ['Subject',   exam.subject],
            ['Exam Date', formatDisplayDate(exam.date)],
            ['Status',    exam.status || 'Scheduled']
        ];

        viewExamDetails.innerHTML = rows.map(function (row) {
            const isFull = row[0] === 'Exam Name';
            return '' +
                '<div class="detail-item' + (isFull ? ' full' : '') + '">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value">' + escapeHtml(row[1]) + '</span>' +
                '</div>';
        }).join('');

        openModal(viewExamModal);
    }

    if (viewExamClose) viewExamClose.addEventListener('click', function () { closeModal(viewExamModal); });
    if (viewExamDone) viewExamDone.addEventListener('click', function () { closeModal(viewExamModal); });

    function handleDeleteExam(examId) {
        const exam = exams.find(function (e) { return e.id === examId; });
        if (!exam) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this exam?\n\n' +
            'Exam: ' + exam.examName + '\n' +
            'Class: ' + exam.className + '\n' +
            'Subject: ' + exam.subject + '\n' +
            'Date: ' + formatDisplayDate(exam.date)
        );
        if (!confirmed) return;

        exams = exams.filter(function (e) { return e.id !== examId; });
        saveExamsToStorage(exams);

        if (examSearchInput.value.trim()) {
            handleSearch();
        } else {
            renderExamsTable(exams);
        }

        showTransientHint('Exam deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            examSearchInput.value = headerSearch.value;
            handleSearch();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        renderExamsTable(exams);
    }

    init();
}

/* =============================================
   RESULTS PAGE SPECIFIC
   ============================================= */
function initResults() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_RESULTS = 'resultsData';
    const STORAGE_KEY_STUDENTS = 'studentsData';
    const STORAGE_KEY_EXAMS    = 'examsData';
    const STORAGE_KEY_SUBJECTS = 'subjectsData';

    let isRedirecting = false;

    const SEED_RESULTS = [
        { id: 'R01', studentId: 'ST001', studentName: 'Ahmad', className: '10th', examName: 'Mid Term Examination', subject: 'Mathematics',      obtainedMarks: 85, totalMarks: 100 },
        { id: 'R02', studentId: 'ST001', studentName: 'Ahmad', className: '10th', examName: 'Mid Term Examination', subject: 'English',          obtainedMarks: 78, totalMarks: 100 },
        { id: 'R03', studentId: 'ST001', studentName: 'Ahmad', className: '10th', examName: 'Mid Term Examination', subject: 'Physics',          obtainedMarks: 82, totalMarks: 100 },
        { id: 'R04', studentId: 'ST001', studentName: 'Ahmad', className: '10th', examName: 'Mid Term Examination', subject: 'Computer Science', obtainedMarks: 91, totalMarks: 100 }
    ];

    const FALLBACK_SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Urdu', 'Islamiyat'];
    const FALLBACK_EXAMS    = ['Mid Term Examination', 'Final Term Examination'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const studentSearchInput  = document.getElementById('studentSearchInput');
    const studentSearchBtn    = document.getElementById('studentSearchBtn');
    const addResultBtn        = document.getElementById('addResultBtn');
    const searchError         = document.getElementById('searchError');
    const matchList           = document.getElementById('matchList');
    const matchListItems      = document.getElementById('matchListItems');

    const studentCard         = document.getElementById('studentCard');
    const studentAvatar       = document.getElementById('studentAvatar');
    const studentName         = document.getElementById('studentName');
    const studentMetaId       = document.getElementById('studentMetaId');
    const studentMetaClass    = document.getElementById('studentMetaClass');
    const studentMetaExam     = document.getElementById('studentMetaExam');
    const printResultBtn      = document.getElementById('printResultBtn');

    const examFilterWrap      = document.getElementById('examFilterWrap');
    const examFilter          = document.getElementById('examFilter');

    const resultsTableBody    = document.getElementById('resultsTableBody');
    const resultsTableFoot    = document.getElementById('resultsTableFoot');
    const totalObtained       = document.getElementById('totalObtained');
    const totalMax            = document.getElementById('totalMax');

    const resultsSummary      = document.getElementById('resultsSummary');
    const summaryObtained     = document.getElementById('summaryObtained');
    const summaryTotal        = document.getElementById('summaryTotal');
    const summaryPercentage   = document.getElementById('summaryPercentage');
    const summaryGrade        = document.getElementById('summaryGrade');
    const summaryStatus       = document.getElementById('summaryStatus');

    const resultFormModal     = document.getElementById('resultFormModal');
    const resultFormTitle     = document.getElementById('resultFormTitle');
    const resultFormClose     = document.getElementById('resultFormClose');
    const resultFormCancel    = document.getElementById('resultFormCancel');
    const resultForm          = document.getElementById('resultForm');
    const resultFormSubmit    = document.getElementById('resultFormSubmit');
    const resultIdHidden      = document.getElementById('resultIdHidden');

    const inputResultStudent  = document.getElementById('inputResultStudent');
    const inputResultExam     = document.getElementById('inputResultExam');
    const inputResultSubject  = document.getElementById('inputResultSubject');
    const inputResultObtained = document.getElementById('inputResultObtained');
    const inputResultTotal    = document.getElementById('inputResultTotal');

    const viewResultModal     = document.getElementById('viewResultModal');
    const viewResultClose     = document.getElementById('viewResultClose');
    const viewResultDone      = document.getElementById('viewResultDone');
    const viewResultBody      = document.getElementById('viewResultBody');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadResultsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_RESULTS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(SEED_RESULTS));
                return SEED_RESULTS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Results] Storage read failed, using seed data.', e);
            return SEED_RESULTS.slice();
        }
    }

    function saveResultsToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Results] Storage write failed.', e);
        }
    }

    function loadStudentsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function loadExamsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_EXAMS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (e) { return e && e.examName ? e.examName : ''; }).filter(Boolean);
        } catch (e) { return []; }
    }

    function loadSubjectsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SUBJECTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (s) {
                if (typeof s === 'string') return s;
                return s && s.name ? s.name : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    let results = loadResultsFromStorage();

    function nextResultId() {
        let maxNum = 0;
        results.forEach(function (r) {
            const m = /^R(\d+)$/.exec(String(r.id || ''));
            if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        });
        const next = maxNum + 1;
        return 'R' + String(next).padStart(2, '0');
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function calculateGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }

    function gradeClass(grade) {
        if (grade === 'A+') return 'grade-a-plus';
        if (grade === 'A')  return 'grade-a';
        if (grade === 'B')  return 'grade-b';
        if (grade === 'C')  return 'grade-c';
        if (grade === 'D')  return 'grade-d';
        return 'grade-f';
    }

    function formatPercentage(obtained, total) {
        if (!total || total <= 0) return '—';
        const pct = (obtained / total) * 100;
        if (!isFinite(pct)) return '—';
        return parseFloat(pct.toFixed(2)) + '%';
    }

    let currentStudent = null;
    let currentExamFilter = '';

    function searchStudents(query) {
        const q = String(query || '').trim().toLowerCase();
        if (!q) return [];

        const students = loadStudentsFromStorage();
        const seen = {};
        const combined = [];

        students.forEach(function (s) {
            const key = String(s.id || s.name);
            if (!seen[key]) {
                seen[key] = true;
                combined.push({ id: s.id, name: s.name, className: s.className });
            }
        });

        results.forEach(function (r) {
            const key = String(r.studentId || r.studentName);
            if (!seen[key]) {
                seen[key] = true;
                combined.push({ id: r.studentId, name: r.studentName, className: r.className });
            }
        });

        return combined.filter(function (s) {
            return (s.name && String(s.name).toLowerCase().includes(q)) ||
                   (s.id && String(s.id).toLowerCase().includes(q)) ||
                   (s.className && String(s.className).toLowerCase().includes(q));
        });
    }

    function clearSearchUI() {
        searchError.classList.remove('show');
        searchError.textContent = '';
        matchList.classList.remove('show');
        matchListItems.innerHTML = '';
        studentCard.classList.remove('show');
        examFilterWrap.classList.remove('show');
        resultsSummary.classList.remove('show');
        resultsTableFoot.style.display = 'none';
        resultsTableBody.innerHTML = '';
    }

    function showSearchError(message) {
        searchError.textContent = message;
        searchError.classList.add('show');
    }

    function handleSearch() {
        clearSearchUI();
        currentStudent = null;
        currentExamFilter = '';

        const raw = studentSearchInput.value.trim();
        if (!raw) {
            showSearchError('Please enter a student name, ID, or class.');
            return;
        }

        const matches = searchStudents(raw);
        if (matches.length === 0) {
            showSearchError('Student not found.');
            return;
        }

        if (matches.length === 1) {
            selectStudent(matches[0]);
            return;
        }

        matchListItems.innerHTML = '';
        matches.forEach(function (s) {
            const item = document.createElement('div');
            item.className = 'results-match-item';
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.innerHTML =
                '<span class="match-id">' + escapeHtml(s.id || '—') + '</span>' +
                '<span class="match-name">' + escapeHtml(s.name || '—') + '</span>' +
                '<span class="match-class">' + escapeHtml(s.className || '—') + '</span>';

            function choose() {
                Array.prototype.forEach.call(
                    matchListItems.querySelectorAll('.results-match-item'),
                    function (el) { el.classList.remove('selected'); }
                );
                item.classList.add('selected');
                selectStudent(s);
            }

            item.addEventListener('click', choose);
            item.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose();
                }
            });

            matchListItems.appendChild(item);
        });
        matchList.classList.add('show');
    }

    function selectStudent(student) {
        currentStudent = student;

        studentCard.classList.add('show');

        const initial = (student.name || 'A').trim().charAt(0).toUpperCase() || 'A';
        studentAvatar.textContent = initial;

        studentName.textContent = student.name || '—';
        studentMetaId.textContent = 'ID: ' + (student.id || '—');
        studentMetaClass.textContent = 'Class: ' + (student.className || '—');

        const studentResults = results.filter(function (r) {
            return String(r.studentId) === String(student.id) ||
                   (String(r.studentName).toLowerCase() === String(student.name).toLowerCase() &&
                    String(r.className) === String(student.className));
        });

        const examsForStudent = [];
        const seenExam = {};
        studentResults.forEach(function (r) {
            const key = String(r.examName || '');
            if (key && !seenExam[key]) {
                seenExam[key] = true;
                examsForStudent.push(key);
            }
        });

        if (examsForStudent.length > 1) {
            examFilter.innerHTML = '<option value="">All Exams</option>';
            examsForStudent.forEach(function (name) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                examFilter.appendChild(opt);
            });
            examFilter.value = '';
            currentExamFilter = '';
            examFilterWrap.classList.add('show');
        } else if (examsForStudent.length === 1) {
            currentExamFilter = examsForStudent[0];
            examFilterWrap.classList.remove('show');
            if (studentMetaExam) studentMetaExam.textContent = 'Exam: ' + examsForStudent[0];
        } else {
            currentExamFilter = '';
            examFilterWrap.classList.remove('show');
            if (studentMetaExam) studentMetaExam.textContent = 'Exam: —';
        }

        renderResultsForStudent(student.id, student.name, student.className);
    }

    function renderResultsForStudent(studentId, studentNameStr, className) {
        let rows = results.filter(function (r) {
            const idMatch = String(r.studentId) === String(studentId);
            const nameMatch = studentNameStr && String(r.studentName).toLowerCase() === String(studentNameStr).toLowerCase();
            return idMatch || (nameMatch && String(r.className) === String(className));
        });

        if (currentExamFilter) {
            rows = rows.filter(function (r) {
                return String(r.examName || '') === currentExamFilter;
            });
        }

        resultsTableBody.innerHTML = '';

        if (rows.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="7" class="empty-state">' +
                '<i class="fas fa-chart-line"></i>' +
                'No results available for this student.</td>';
            resultsTableBody.appendChild(tr);
            resultsTableFoot.style.display = 'none';
            resultsSummary.classList.remove('show');
            return;
        }

        let totalObtainedSum = 0;
        let totalMaxSum = 0;

        rows.forEach(function (r) {
            const ob = Number(r.obtainedMarks) || 0;
            const tm = Number(r.totalMarks) || 0;
            totalObtainedSum += ob;
            totalMaxSum += tm;

            const pct = tm > 0 ? (ob / tm) * 100 : 0;
            const grade = calculateGrade(pct);
            const status = pct >= 50 ? 'Pass' : 'Fail';

            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + escapeHtml(r.subject || '—') + '</td>' +
                '<td class="right">' + ob + '</td>' +
                '<td class="right">' + tm + '</td>' +
                '<td class="right">' + formatPercentage(ob, tm) + '</td>' +
                '<td><span class="grade-pill ' + gradeClass(grade) + '">' + grade + '</span></td>' +
                '<td><span class="result-status-pill ' + (status === 'Pass' ? 'pass' : 'fail') + '">' + status + '</span></td>' +
                '<td>' +
                    '<div class="row-actions">' +
                        '<button type="button" class="btn-action btn-view-result" data-id="' + escapeHtml(r.id) + '"><i class="fas fa-eye"></i> View</button>' +
                        '<button type="button" class="btn-action btn-edit-result" data-id="' + escapeHtml(r.id) + '"><i class="fas fa-pen"></i> Edit</button>' +
                        '<button type="button" class="btn-action btn-delete-result" data-id="' + escapeHtml(r.id) + '"><i class="fas fa-trash"></i> Delete</button>' +
                    '</div>' +
                '</td>';
            resultsTableBody.appendChild(tr);
        });

        resultsTableBody.querySelectorAll('.btn-view-result').forEach(function (btn) {
            btn.addEventListener('click', function () { openViewResult(btn.getAttribute('data-id')); });
        });
        resultsTableBody.querySelectorAll('.btn-edit-result').forEach(function (btn) {
            btn.addEventListener('click', function () { openEditResult(btn.getAttribute('data-id')); });
        });
        resultsTableBody.querySelectorAll('.btn-delete-result').forEach(function (btn) {
            btn.addEventListener('click', function () { handleDeleteResult(btn.getAttribute('data-id')); });
        });

        totalObtained.textContent = totalObtainedSum;
        totalMax.textContent = totalMaxSum;
        resultsTableFoot.style.display = '';

        const overallPct = totalMaxSum > 0 ? (totalObtainedSum / totalMaxSum) * 100 : 0;
        const overallGrade = calculateGrade(overallPct);
        const overallStatus = overallPct >= 50 ? 'Pass' : 'Fail';

        summaryObtained.textContent = totalObtainedSum;
        summaryTotal.textContent = totalMaxSum;
        summaryPercentage.textContent = formatPercentage(totalObtainedSum, totalMaxSum);
        summaryGrade.textContent = overallGrade;
        summaryGrade.className = 'summary-value ' + gradeClass(overallGrade);
        summaryStatus.textContent = overallStatus;
        summaryStatus.className = 'summary-value ' + (overallStatus === 'Pass' ? 'grade-a' : 'grade-f');
        resultsSummary.classList.add('show');
    }

    if (studentSearchBtn) studentSearchBtn.addEventListener('click', handleSearch);
    if (studentSearchInput) {
        studentSearchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
        studentSearchInput.addEventListener('input', function () {
            if (!studentSearchInput.value.trim()) {
                clearSearchUI();
                return;
            }
            searchError.classList.remove('show');
        });
    }

    if (examFilter) {
        examFilter.addEventListener('change', function () {
            currentExamFilter = examFilter.value;
            if (currentStudent) {
                renderResultsForStudent(currentStudent.id, currentStudent.name, currentStudent.className);
                if (currentExamFilter && studentMetaExam) {
                    studentMetaExam.textContent = 'Exam: ' + currentExamFilter;
                } else if (studentMetaExam) {
                    studentMetaExam.textContent = 'Exam: All';
                }
            }
        });
    }

    if (printResultBtn) {
        printResultBtn.addEventListener('click', function () {
            window.print();
        });
    }

    function resetFormErrors() {
        document.querySelectorAll('#resultForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#resultForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function populateStudentDropdown(selectedId) {
        inputResultStudent.innerHTML = '<option value="">-- Select Student --</option>';
        const students = loadStudentsFromStorage();
        let list = students.map(function (s) { return { id: s.id, name: s.name, className: s.className }; });
        const seen = {};
        list.forEach(function (s) { seen[String(s.id)] = true; });
        results.forEach(function (r) {
            if (r.studentId && !seen[String(r.studentId)]) {
                seen[String(r.studentId)] = true;
                list.push({ id: r.studentId, name: r.studentName, className: r.className });
            }
        });

        list.forEach(function (s) {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = (s.name || '—') + ' (' + (s.id || '—') + ') — ' + (s.className || '—');
            opt.dataset.name = s.name || '';
            opt.dataset.className = s.className || '';
            inputResultStudent.appendChild(opt);
        });

        if (selectedId) inputResultStudent.value = selectedId;
    }

    function populateExamDropdown(selectedValue) {
        inputResultExam.innerHTML = '<option value="">-- Select Exam --</option>';
        let exams = loadExamsFromStorage();
        if (exams.length === 0) exams = FALLBACK_EXAMS.slice();
        if (selectedValue && exams.indexOf(selectedValue) === -1) exams.push(selectedValue);
        exams.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputResultExam.appendChild(opt);
        });
        if (selectedValue) inputResultExam.value = selectedValue;
    }

    function populateSubjectDropdown(selectedValue) {
        inputResultSubject.innerHTML = '<option value="">-- Select Subject --</option>';
        let subjects = loadSubjectsFromStorage();
        if (subjects.length === 0) subjects = FALLBACK_SUBJECTS.slice();
        if (selectedValue && subjects.indexOf(selectedValue) === -1) subjects.push(selectedValue);
        subjects.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputResultSubject.appendChild(opt);
        });
        if (selectedValue) inputResultSubject.value = selectedValue;
    }

    function openAddResult() {
        resetFormErrors();
        resultForm.reset();
        resultIdHidden.value = '';
        populateStudentDropdown(null);
        populateExamDropdown(null);
        populateSubjectDropdown(null);
        if (currentStudent && currentStudent.id) {
            inputResultStudent.value = currentStudent.id;
        }
        resultFormTitle.innerHTML = '<i class="fas fa-plus"></i> Add Result';
        resultFormSubmit.innerHTML = '<i class="fas fa-save"></i> Save Result';
        openModal(resultFormModal);
        setTimeout(function () { inputResultStudent.focus(); }, 50);
    }

    function openEditResult(resultId) {
        const r = results.find(function (x) { return String(x.id) === String(resultId); });
        if (!r) return;
        resetFormErrors();
        resultForm.reset();
        resultIdHidden.value = r.id;
        populateStudentDropdown(r.studentId);
        populateExamDropdown(r.examName);
        populateSubjectDropdown(r.subject);
        inputResultObtained.value = r.obtainedMarks;
        inputResultTotal.value = r.totalMarks;

        resultFormTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Result';
        resultFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Result';
        openModal(resultFormModal);
        setTimeout(function () { inputResultObtained.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addResultBtn) addResultBtn.addEventListener('click', openAddResult);
    if (resultFormClose) resultFormClose.addEventListener('click', function () { closeModal(resultFormModal); });
    if (resultFormCancel) resultFormCancel.addEventListener('click', function () { closeModal(resultFormModal); });

    if (resultFormModal) {
        resultFormModal.addEventListener('click', function (e) {
            if (e.target === resultFormModal) closeModal(resultFormModal);
        });
    }
    if (viewResultModal) {
        viewResultModal.addEventListener('click', function (e) {
            if (e.target === viewResultModal) closeModal(viewResultModal);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (resultFormModal && resultFormModal.classList.contains('open')) closeModal(resultFormModal);
        if (viewResultModal && viewResultModal.classList.contains('open')) closeModal(viewResultModal);
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const studentId = inputResultStudent.value;
        const examName  = inputResultExam.value;
        const subject   = inputResultSubject.value;
        const obtained  = inputResultObtained.value;
        const total     = inputResultTotal.value;

        if (!studentId) { setFieldError('inputResultStudent', 'error-student', 'Please select a student.'); ok = false; }
        if (!examName) { setFieldError('inputResultExam', 'error-exam', 'Please select an exam.'); ok = false; }
        if (!subject) { setFieldError('inputResultSubject', 'error-subject', 'Please select a subject.'); ok = false; }

        if (obtained === '' || obtained == null) {
            setFieldError('inputResultObtained', 'error-obtained', 'Please enter obtained marks.');
            ok = false;
        } else if (isNaN(Number(obtained)) || Number(obtained) < 0) {
            setFieldError('inputResultObtained', 'error-obtained', 'Please enter a valid number.');
            ok = false;
        }

        if (total === '' || total == null) {
            setFieldError('inputResultTotal', 'error-total', 'Please enter total marks.');
            ok = false;
        } else if (isNaN(Number(total)) || Number(total) <= 0) {
            setFieldError('inputResultTotal', 'error-total', 'Total marks must be greater than 0.');
            ok = false;
        }

        if (ok && Number(obtained) > Number(total)) {
            setFieldError('inputResultObtained', 'error-obtained', 'Obtained marks cannot be greater than total marks.');
            ok = false;
        }

        return ok;
    }

    if (resultForm) {
        resultForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#resultForm .form-field.has-error input, #resultForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = resultIdHidden.value;

            const studentOption = inputResultStudent.options[inputResultStudent.selectedIndex];
            const studentNameVal = studentOption ? studentOption.dataset.name : '';
            const classNameVal = studentOption ? studentOption.dataset.className : '';

            const record = {
                id:           editingId || nextResultId(),
                studentId:    inputResultStudent.value,
                studentName:  studentNameVal,
                className:    classNameVal,
                examName:     inputResultExam.value,
                subject:      inputResultSubject.value,
                obtainedMarks: Number(inputResultObtained.value) || 0,
                totalMarks:    Number(inputResultTotal.value) || 0
            };

            if (editingId) {
                const idx = results.findIndex(function (r) { return String(r.id) === String(editingId); });
                if (idx !== -1) results[idx] = record;
                showTransientHint('Result updated successfully.', 'success');
            } else {
                results.push(record);
                showTransientHint('Result added successfully.', 'success');
            }

            saveResultsToStorage(results);
            closeModal(resultFormModal);

            if (currentStudent) {
                selectStudent(currentStudent);
            }
        });
    }

    function openViewResult(resultId) {
        const r = results.find(function (x) { return String(x.id) === String(resultId); });
        if (!r) return;

        const ob = Number(r.obtainedMarks) || 0;
        const tm = Number(r.totalMarks) || 0;
        const pct = tm > 0 ? (ob / tm) * 100 : 0;
        const grade = calculateGrade(pct);
        const status = pct >= 50 ? 'Pass' : 'Fail';

        viewResultBody.innerHTML =
            '<div class="details-grid">' +
                '<div class="detail-item"><span class="detail-label">Student</span><span class="detail-value">' + escapeHtml(r.studentName || '—') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Student ID</span><span class="detail-value">' + escapeHtml(r.studentId || '—') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Class</span><span class="detail-value">' + escapeHtml(r.className || '—') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Exam</span><span class="detail-value">' + escapeHtml(r.examName || '—') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Subject</span><span class="detail-value">' + escapeHtml(r.subject || '—') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Obtained / Total</span><span class="detail-value">' + ob + ' / ' + tm + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Percentage</span><span class="detail-value">' + formatPercentage(ob, tm) + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Grade</span><span class="detail-value"><span class="grade-pill ' + gradeClass(grade) + '">' + grade + '</span></span></div>' +
                '<div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="result-status-pill ' + (status === 'Pass' ? 'pass' : 'fail') + '">' + status + '</span></span></div>' +
            '</div>';

        openModal(viewResultModal);
    }
    if (viewResultClose) viewResultClose.addEventListener('click', function () { closeModal(viewResultModal); });
    if (viewResultDone) viewResultDone.addEventListener('click', function () { closeModal(viewResultModal); });

    function handleDeleteResult(resultId) {
        const r = results.find(function (x) { return String(x.id) === String(resultId); });
        if (!r) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this result?\n\n' +
            'Student: ' + r.studentName + '\n' +
            'Subject: ' + r.subject + '\n' +
            'Exam: ' + r.examName
        );
        if (!confirmed) return;

        results = results.filter(function (x) { return String(x.id) !== String(resultId); });
        saveResultsToStorage(results);

        if (currentStudent) {
            selectStudent(currentStudent);
        }

        showTransientHint('Result deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            studentSearchInput.value = headerSearch.value;
            if (!headerSearch.value.trim()) {
                clearSearchUI();
                return;
            }
            searchError.classList.remove('show');
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        resultsTableBody.innerHTML =
            '<tr><td colspan="7" class="empty-state">' +
                '<i class="fas fa-user-graduate"></i>' +
                'Search for a student to view their results.' +
            '</td></tr>';
    }

    init();
}

/* =============================================
   FEES PAGE SPECIFIC
   ============================================= */
function initFees() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_FEES = 'feesData';
    const STORAGE_KEY_STUDENTS = 'studentsData';

    let isRedirecting = false;

    const SEED_FEES = [
        {
            id: 'F001',
            studentId: 'ST001',
            studentName: 'Ahmad',
            className: '10th',
            amount: 5000,
            paidAmount: 5000,
            dueDate: '2026-10-15',
            status: 'Paid',
            paymentHistory: [
                { amount: 5000, date: '2026-09-15' }
            ]
        },
        {
            id: 'F002',
            studentId: 'ST002',
            studentName: 'Ali',
            className: '9th',
            amount: 5000,
            paidAmount: 0,
            dueDate: '2026-10-20',
            status: 'Unpaid',
            paymentHistory: []
        }
    ];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const feesSearchInput     = document.getElementById('feesSearchInput');
    const addFeeBtn           = document.getElementById('addFeeBtn');
    const feesTableBody       = document.getElementById('feesTableBody');

    const summaryTotal        = document.getElementById('summaryTotal');
    const summaryPaid         = document.getElementById('summaryPaid');
    const summaryUnpaid       = document.getElementById('summaryUnpaid');
    const summaryRemaining    = document.getElementById('summaryRemaining');

    const feeFormModal        = document.getElementById('feeFormModal');
    const feeFormTitle        = document.getElementById('feeFormTitle');
    const feeFormClose        = document.getElementById('feeFormClose');
    const feeFormCancel       = document.getElementById('feeFormCancel');
    const feeForm             = document.getElementById('feeForm');
    const feeFormSubmit       = document.getElementById('feeFormSubmit');
    const feeIdHidden         = document.getElementById('feeIdHidden');

    const inputFeeStudent     = document.getElementById('inputFeeStudent');
    const inputFeeClass       = document.getElementById('inputFeeClass');
    const inputFeeAmount      = document.getElementById('inputFeeAmount');
    const inputFeeDueDate     = document.getElementById('inputFeeDueDate');
    const inputFeeStatus      = document.getElementById('inputFeeStatus');

    const payFeeModal         = document.getElementById('payFeeModal');
    const payFeeClose         = document.getElementById('payFeeClose');
    const payFeeCancel        = document.getElementById('payFeeCancel');
    const payFeeDetails       = document.getElementById('payFeeDetails');
    const payFeeForm          = document.getElementById('payFeeForm');
    const inputPayAmount      = document.getElementById('inputPayAmount');
    const confirmPaymentBtn   = document.getElementById('confirmPaymentBtn');

    const viewFeeModal        = document.getElementById('viewFeeModal');
    const viewFeeClose        = document.getElementById('viewFeeClose');
    const viewFeeDone         = document.getElementById('viewFeeDone');
    const viewFeeDetails      = document.getElementById('viewFeeDetails');
    const viewFeeHistoryWrap  = document.getElementById('viewFeeHistoryWrap');

    const transientHint       = document.getElementById('transientHint');

    let payingFeeId = null;
    let viewingFeeId = null;

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadFeesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_FEES);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_FEES, JSON.stringify(SEED_FEES));
                return SEED_FEES.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Fees] Storage read failed, using seed data.', e);
            return SEED_FEES.slice();
        }
    }

    function saveFeesToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_FEES, JSON.stringify(list));
        } catch (e) {
            console.warn('[Fees] Storage write failed.', e);
        }
    }

    function loadStudentsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    let fees = loadFeesFromStorage();

    function nextFeeId() {
        let maxNum = 0;
        fees.forEach(function (f) {
            const m = /^F(\d+)$/.exec(String(f.id || ''));
            if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        });
        const next = maxNum + 1;
        return 'F' + String(next).padStart(3, '0');
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        if (!transientHint) return;
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function todayISO() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
    }

    function formatDisplayDate(iso) {
        if (!iso) return '—';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function formatCurrency(n) {
        const num = Number(n) || 0;
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function calculateStatus(total, paid) {
        const remaining = (Number(total) || 0) - (Number(paid) || 0);
        if (remaining <= 0) return 'Paid';
        if ((Number(paid) || 0) > 0) return 'Partially Paid';
        return 'Unpaid';
    }

    function renderSummary() {
        let total = 0, paid = 0, unpaid = 0, remaining = 0;
        fees.forEach(function (f) {
            const amt = Number(f.amount) || 0;
            const pd = Number(f.paidAmount) || 0;
            const rem = amt - pd;

            total += amt;
            paid += pd;
            if (rem > 0) unpaid += rem;
            remaining += rem;
        });

        summaryTotal.textContent = formatCurrency(total);
        summaryPaid.textContent = formatCurrency(paid);
        summaryUnpaid.textContent = formatCurrency(unpaid);
        summaryRemaining.textContent = formatCurrency(remaining);
    }

    function renderFeesTable(list) {
        feesTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="10" class="empty-state">' +
                '<i class="fas fa-user-slash"></i>' +
                'No fee records found.</td>';
            feesTableBody.appendChild(tr);
            return;
        }

        list.forEach(function (fee) {
            const tr = document.createElement('tr');

            const feeInfo = sfResolveFeeInfo(fee);
            const amt = Number(fee.amount) || 0;
            const paid = Number(fee.paidAmount) || 0;
            const remaining = amt - paid;

            tr.appendChild(td(feeInfo.studentName));
            tr.appendChild(td(fee.studentId || '—'));
            tr.appendChild(td(fee.className || '—'));
            tr.appendChild(td(feeInfo.feeType));

            const amtTd = document.createElement('td');
            amtTd.className = 'right';
            amtTd.textContent = formatCurrency(amt);
            tr.appendChild(amtTd);

            const paidTd = document.createElement('td');
            paidTd.className = 'right';
            paidTd.textContent = formatCurrency(paid);
            tr.appendChild(paidTd);

            const remTd = document.createElement('td');
            remTd.className = 'right';
            remTd.textContent = formatCurrency(remaining);
            tr.appendChild(remTd);

            tr.appendChild(td(formatDisplayDate(fee.dueDate)));

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            const statusClass = (fee.status || 'Unpaid').toLowerCase().replace(/\s+/g, '-');
            pill.className = 'status-pill ' + statusClass;
            pill.textContent = fee.status || 'Unpaid';
            statusTd.appendChild(pill);
            tr.appendChild(statusTd);

            const actionTd = document.createElement('td');
            const actionMenu = document.createElement('div');
            actionMenu.className = 'action-menu';

            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = 'action-menu-btn';
            menuBtn.setAttribute('aria-label', 'More actions');
            menuBtn.setAttribute('aria-haspopup', 'true');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = '⋮';

            const dropdown = document.createElement('div');
            dropdown.className = 'action-menu-dropdown';
            dropdown.setAttribute('role', 'menu');

            const viewItem = document.createElement('button');
            viewItem.type = 'button';
            viewItem.className = 'action-menu-item';
            viewItem.setAttribute('role', 'menuitem');
            viewItem.innerHTML = '<i class="fas fa-eye"></i> View';
            viewItem.addEventListener('click', function () {
                openViewFee(fee.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const editItem = document.createElement('button');
            editItem.type = 'button';
            editItem.className = 'action-menu-item';
            editItem.setAttribute('role', 'menuitem');
            editItem.innerHTML = '<i class="fas fa-pen"></i> Edit';
            editItem.addEventListener('click', function () {
                openEditFee(fee.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const deleteItem = document.createElement('button');
            deleteItem.type = 'button';
            deleteItem.className = 'action-menu-item delete';
            deleteItem.setAttribute('role', 'menuitem');
            deleteItem.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteItem.addEventListener('click', function () {
                handleDeleteFee(fee.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const feeCardItem = document.createElement('button');
            feeCardItem.type = 'button';
            feeCardItem.className = 'action-menu-item';
            feeCardItem.setAttribute('role', 'menuitem');
            feeCardItem.innerHTML = '<i class="fas fa-money-check-dollar"></i> Fee Card';
            feeCardItem.addEventListener('click', function () {
                sfOpenStudentFeeCard(fee.studentId);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            dropdown.appendChild(viewItem);
            dropdown.appendChild(editItem);
            dropdown.appendChild(deleteItem);
            dropdown.appendChild(feeCardItem);

            actionMenu.appendChild(menuBtn);
            actionMenu.appendChild(dropdown);
            actionTd.appendChild(actionMenu);

            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (openDropdown) {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('show');
                        const otherBtn = openDropdown.previousElementSibling;
                        if (otherBtn && otherBtn.classList.contains('action-menu-btn')) {
                            otherBtn.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
                const isOpen = dropdown.classList.toggle('show');
                menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                if (isOpen) positionActionDropdown(dropdown, menuBtn);
            });

            if (fee.status !== 'Paid' && remaining > 0) {
                const payBtn = document.createElement('button');
                payBtn.type = 'button';
                payBtn.className = 'btn-action btn-pay-fee';
                payBtn.innerHTML = '<i class="fas fa-money-check-dollar"></i> Pay';
                payBtn.addEventListener('click', function () { openPayFee(fee.id); });
                actionTd.appendChild(payBtn);
            }

            tr.appendChild(actionTd);

            feesTableBody.appendChild(tr);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function refreshAll() {
        renderSummary();
        const q = feesSearchInput.value.trim().toLowerCase();
        let filtered = fees;
        if (q) {
            filtered = fees.filter(function (f) {
                return (f.studentName && f.studentName.toLowerCase().includes(q)) ||
                       (f.studentId && String(f.studentId).toLowerCase().includes(q)) ||
                       (f.className && f.className.toLowerCase().includes(q));
            });
        }
        renderFeesTable(filtered);
    }

    if (feesSearchInput) feesSearchInput.addEventListener('input', refreshAll);

    function populateStudentDropdown(selectedId) {
        inputFeeStudent.innerHTML = '<option value="">-- Select Student --</option>';
        const students = loadStudentsFromStorage();
        let list = students.map(function (s) { return { id: s.id, name: s.name, className: s.className }; });

        const seen = {};
        list.forEach(function (s) { seen[String(s.id)] = true; });
        fees.forEach(function (f) {
            if (f.studentId && !seen[String(f.studentId)]) {
                seen[String(f.studentId)] = true;
                list.push({ id: f.studentId, name: f.studentName, className: f.className });
            }
        });

        list.forEach(function (s) {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = (s.name || '—') + ' (' + (s.id || '—') + ')';
            opt.dataset.name = s.name || '';
            opt.dataset.className = s.className || '';
            opt.dataset.feeType = getStudentEffectiveFeeType(s);
            opt.dataset.monthlyFee = String(getStudentMonthlyFee(s));
            inputFeeStudent.appendChild(opt);
        });

        if (selectedId) inputFeeStudent.value = selectedId;
    }

    if (inputFeeStudent) {
        inputFeeStudent.addEventListener('change', function () {
            const opt = inputFeeStudent.options[inputFeeStudent.selectedIndex];
            if (opt && opt.dataset.className) {
                inputFeeClass.value = opt.dataset.className;
            } else {
                inputFeeClass.value = '';
            }
            if (!feeIdHidden.value && opt && opt.dataset.monthlyFee) {
                inputFeeAmount.value = opt.dataset.monthlyFee;
            }
        });
    }

    function resetFormErrors() {
        document.querySelectorAll('#feeForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#feeForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        feeForm.reset();
        feeIdHidden.value = '';
        inputFeeClass.value = '';
        inputFeeDueDate.value = todayISO();
        inputFeeStatus.value = 'Unpaid';
        resetFormErrors();
    }

    function openAddFee() {
        clearForm();
        populateStudentDropdown(null);
        feeFormTitle.innerHTML = '<i class="fas fa-plus"></i> Add Fee';
        feeFormSubmit.innerHTML = '<i class="fas fa-save"></i> Save Fee';
        openModal(feeFormModal);
        setTimeout(function () { inputFeeStudent.focus(); }, 50);
    }

    function openEditFee(feeId) {
        const fee = fees.find(function (f) { return String(f.id) === String(feeId); });
        if (!fee) return;

        clearForm();
        feeIdHidden.value = fee.id;
        populateStudentDropdown(fee.studentId);
        inputFeeClass.value = fee.className || '';
        inputFeeAmount.value = fee.amount || 0;
        inputFeeDueDate.value = fee.dueDate || todayISO();
        inputFeeStatus.value = fee.status || 'Unpaid';

        feeFormTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Fee';
        feeFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Fee';
        openModal(feeFormModal);
        setTimeout(function () { inputFeeAmount.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addFeeBtn) addFeeBtn.addEventListener('click', openAddFee);
    if (feeFormClose) feeFormClose.addEventListener('click', function () { closeModal(feeFormModal); clearForm(); });
    if (feeFormCancel) feeFormCancel.addEventListener('click', function () { closeModal(feeFormModal); clearForm(); });

    if (feeFormModal) {
        feeFormModal.addEventListener('click', function (e) {
            if (e.target === feeFormModal) { closeModal(feeFormModal); clearForm(); }
        });
    }
    if (payFeeModal) {
        payFeeModal.addEventListener('click', function (e) {
            if (e.target === payFeeModal) { closeModal(payFeeModal); payingFeeId = null; }
        });
    }
    if (viewFeeModal) {
        viewFeeModal.addEventListener('click', function (e) {
            if (e.target === viewFeeModal) { closeModal(viewFeeModal); viewingFeeId = null; }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (feeFormModal && feeFormModal.classList.contains('open')) { closeModal(feeFormModal); clearForm(); }
        if (payFeeModal && payFeeModal.classList.contains('open')) { closeModal(payFeeModal); payingFeeId = null; }
        if (viewFeeModal && viewFeeModal.classList.contains('open')) { closeModal(viewFeeModal); viewingFeeId = null; }
    });

    function validateFeeForm() {
        resetFormErrors();
        let ok = true;

        const studentId = inputFeeStudent.value;
        const amount    = inputFeeAmount.value;
        const dueDate   = inputFeeDueDate.value;
        const status    = inputFeeStatus.value;

        if (!studentId) { setFieldError('inputFeeStudent', 'error-student', 'Please select a student.'); ok = false; }

        if (amount === '' || amount == null) {
            setFieldError('inputFeeAmount', 'error-amount', 'Please enter the fee amount.');
            ok = false;
        } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
            setFieldError('inputFeeAmount', 'error-amount', 'Please enter a valid amount.');
            ok = false;
        }

        if (!dueDate) { setFieldError('inputFeeDueDate', 'error-dueDate', 'Please select a due date.'); ok = false; }
        if (!status) { setFieldError('inputFeeStatus', 'error-status', 'Please select a status.'); ok = false; }

        return ok;
    }

    if (feeForm) {
        feeForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateFeeForm()) {
                const firstErr = document.querySelector('#feeForm .form-field.has-error input, #feeForm .form-field.has-error select');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = feeIdHidden.value;
            const studentOption = inputFeeStudent.options[inputFeeStudent.selectedIndex];
            const studentName = studentOption ? studentOption.dataset.name : '';

            const newAmount = Number(inputFeeAmount.value) || 0;

            if (editingId) {
                const idx = fees.findIndex(function (f) { return String(f.id) === String(editingId); });
                if (idx !== -1) {
                    const existing = fees[idx];
                    const paidAmount = Number(existing.paidAmount) || 0;

                    fees[idx] = {
                        id: existing.id,
                        studentId: inputFeeStudent.value,
                        studentName: studentName,
                        className: inputFeeClass.value || existing.className,
                        feeType: getStudentEffectiveFeeType(
                            loadStudentsFromStorage().find(function (s) {
                                return String(s.id) === String(inputFeeStudent.value);
                            }) || { feeType: existing.feeType }
                        ),
                        monthKey: existing.monthKey,
                        amount: newAmount,
                        paidAmount: paidAmount,
                        dueDate: inputFeeDueDate.value,
                        status: paidAmount >= newAmount ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : inputFeeStatus.value || 'Unpaid'),
                        paymentHistory: existing.paymentHistory || []
                    };

                    if (paidAmount >= newAmount) {
                        fees[idx].status = 'Paid';
                    } else if (paidAmount > 0) {
                        fees[idx].status = 'Partially Paid';
                    }
                }
                showTransientHint('Fee record updated successfully.', 'success');
            } else {
                const record = {
                    id: nextFeeId(),
                    studentId: inputFeeStudent.value,
                    studentName: studentName,
                    className: inputFeeClass.value || '',
                    feeType: getStudentEffectiveFeeType(
                        loadStudentsFromStorage().find(function (s) {
                            return String(s.id) === String(inputFeeStudent.value);
                        }) || {}
                    ),
                    monthKey: sfCurrentMonthKey(),
                    amount: newAmount,
                    paidAmount: 0,
                    dueDate: inputFeeDueDate.value,
                    status: 'Unpaid',
                    paymentHistory: []
                };
                fees.push(record);
                showTransientHint('Fee record added successfully.', 'success');
            }

            saveFeesToStorage(fees);
            refreshAll();

            closeModal(feeFormModal);
            clearForm();
        });
    }

    function openPayFee(feeId) {
        const fee = fees.find(function (f) { return String(f.id) === String(feeId); });
        if (!fee) { showTransientHint('Fee record not found.', 'error'); return; }

        const amt = Number(fee.amount) || 0;
        const paid = Number(fee.paidAmount) || 0;
        const remaining = amt - paid;

        if (remaining <= 0) {
            showTransientHint('This fee has already been fully paid.', 'error');
            return;
        }

        payingFeeId = feeId;

        const rows = [
            ['Student', fee.studentName || '—'],
            ['Class',   fee.className   || '—'],
            ['Total Fee', formatCurrency(amt)],
            ['Paid',      formatCurrency(paid)],
            ['Remaining', formatCurrency(remaining)]
        ];

        payFeeDetails.innerHTML = rows.map(function (row) {
            const isAmount = row[0] === 'Total Fee' || row[0] === 'Paid' || row[0] === 'Remaining';
            return '' +
                '<div class="detail-item">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value' + (isAmount ? ' amount' : '') + '">' +
                        escapeHtml(row[1]) +
                    '</span>' +
                '</div>';
        }).join('');

        inputPayAmount.value = '';
        inputPayAmount.max = remaining;
        document.getElementById('error-payAmount').textContent = '';
        document.getElementById('error-payAmount').classList.remove('show');
        inputPayAmount.parentElement.classList.remove('has-error');

        openModal(payFeeModal);
        setTimeout(function () { inputPayAmount.focus(); }, 50);
    }

    if (payFeeForm) {
        payFeeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (payingFeeId == null) return;

            const fee = fees.find(function (f) { return String(f.id) === String(payingFeeId); });
            if (!fee) { showTransientHint('Fee record not found.', 'error'); return; }

            const amt = Number(fee.amount) || 0;
            const paid = Number(fee.paidAmount) || 0;
            const remaining = amt - paid;

            const payAmtRaw = inputPayAmount.value;
            const payAmt = Number(payAmtRaw);

            const errEl = document.getElementById('error-payAmount');
            const fieldEl = inputPayAmount.parentElement;
            errEl.classList.remove('show');
            fieldEl.classList.remove('has-error');

            if (payAmtRaw === '' || isNaN(payAmt) || payAmt <= 0) {
                errEl.textContent = 'Please enter a valid payment amount.';
                errEl.classList.add('show');
                fieldEl.classList.add('has-error');
                return;
            }

            if (payAmt > remaining) {
                errEl.textContent = 'Payment amount cannot exceed the remaining amount (' + formatCurrency(remaining) + ').';
                errEl.classList.add('show');
                fieldEl.classList.add('has-error');
                return;
            }

            const idx = fees.findIndex(function (f) { return String(f.id) === String(payingFeeId); });
            if (idx === -1) { showTransientHint('Fee record not found.', 'error'); return; }

            const newPaid = paid + payAmt;
            const newStatus = calculateStatus(amt, newPaid);

            fees[idx].paidAmount = newPaid;
            fees[idx].status = newStatus;
            if (!Array.isArray(fees[idx].paymentHistory)) fees[idx].paymentHistory = [];
            fees[idx].paymentHistory.push({ amount: payAmt, date: todayISO() });

            saveFeesToStorage(fees);
            refreshAll();

            closeModal(payFeeModal);
            payingFeeId = null;

            showTransientHint('Payment recorded successfully.', 'success');
        });
    }

    if (payFeeClose) payFeeClose.addEventListener('click', function () { closeModal(payFeeModal); payingFeeId = null; });
    if (payFeeCancel) payFeeCancel.addEventListener('click', function () { closeModal(payFeeModal); payingFeeId = null; });

    function openViewFee(feeId) {
        const fee = fees.find(function (f) { return String(f.id) === String(feeId); });
        if (!fee) { showTransientHint('Fee record not found.', 'error'); return; }

        viewingFeeId = feeId;

        const feeInfo = sfResolveFeeInfo(fee);
        const amt = Number(fee.amount) || 0;
        const paid = Number(fee.paidAmount) || 0;
        const remaining = amt - paid;

        const rows = [
            ['Fee ID',       fee.id || '—'],
            ['Student',      feeInfo.studentName],
            ['Student ID',   fee.studentId || '—'],
            ['Class',        fee.className   || '—'],
            ['Fee Type',     feeInfo.feeType],
            ['Monthly Fee',  formatCurrency(feeInfo.monthlyFee)],
            ['Total Fee',    formatCurrency(amt)],
            ['Paid Amount',  formatCurrency(paid)],
            ['Remaining',    formatCurrency(remaining)],
            ['Due Date',     formatDisplayDate(fee.dueDate)],
            ['Status',       fee.status || 'Unpaid']
        ];

        viewFeeDetails.innerHTML = rows.map(function (row) {
            const isAmount = ['Monthly Fee', 'Total Fee', 'Paid Amount', 'Remaining'].indexOf(row[0]) !== -1;
            return '' +
                '<div class="detail-item">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value' + (isAmount ? ' amount' : '') + '">' +
                        escapeHtml(row[1]) +
                    '</span>' +
                '</div>';
        }).join('');

        const history = Array.isArray(fee.paymentHistory) ? fee.paymentHistory : [];
        if (history.length === 0) {
            viewFeeHistoryWrap.innerHTML =
                '<div class="payment-history-heading"><i class="fas fa-receipt"></i> Payment History</div>' +
                '<div class="payment-history-empty">No payments recorded yet.</div>';
        } else {
            const historyHtml = history.map(function (h) {
                return '' +
                    '<div class="payment-history-row">' +
                        '<span class="ph-date"><i class="fas fa-calendar-day"></i> ' + escapeHtml(formatDisplayDate(h.date)) + '</span>' +
                        '<span class="ph-amount">' + formatCurrency(h.amount) + '</span>' +
                    '</div>';
            }).join('');

            viewFeeHistoryWrap.innerHTML =
                '<div class="payment-history-heading"><i class="fas fa-receipt"></i> Payment History</div>' +
                '<div class="payment-history-list">' + historyHtml + '</div>';
        }

        openModal(viewFeeModal);
    }

    if (viewFeeClose) viewFeeClose.addEventListener('click', function () { closeModal(viewFeeModal); viewingFeeId = null; });
    if (viewFeeDone) viewFeeDone.addEventListener('click', function () { closeModal(viewFeeModal); viewingFeeId = null; });

    function handleDeleteFee(feeId) {
        const fee = fees.find(function (f) { return String(f.id) === String(feeId); });
        if (!fee) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this fee record?\n\n' +
            'Student: ' + (fee.studentName || '—') + '\n' +
            'Class: ' + (fee.className || '—') + '\n' +
            'Total Fee: ' + formatCurrency(fee.amount)
        );
        if (!confirmed) return;

        fees = fees.filter(function (f) { return String(f.id) !== String(feeId); });
        saveFeesToStorage(fees);
        refreshAll();

        showTransientHint('Fee record deleted.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            feesSearchInput.value = headerSearch.value;
            refreshAll();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();

        fees = sfEnsureMonthlyFeeRecords();
        refreshAll();

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    }

    init();
}

/* =============================================
   NOTICES PAGE SPECIFIC
   ============================================= */
function initNotices() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN  = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_NOTICES = 'noticesData';
    const STORAGE_KEY_CLASSES = 'classesData';

    const PER_PAGE = 6;
    const MAX_CONTENT_LENGTH = 1000;
    const MAX_TITLE_LENGTH = 150;
    const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
    const MAX_PDF_BYTES = 2 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    const CANONICAL_CATEGORIES = ['Exams', 'Holidays', 'Events', 'Meetings', 'Admissions', 'General'];
    const CATEGORY_ALIAS = {
        'exam': 'Exams', 'exams': 'Exams', 'examination': 'Exams', 'examinations': 'Exams',
        'holiday': 'Holidays', 'holidays': 'Holidays',
        'event': 'Events', 'events': 'Events',
        'meeting': 'Meetings', 'meetings': 'Meetings',
        'admission': 'Admissions', 'admissions': 'Admissions',
        'general': 'General', 'important': 'General', 'announcement': 'General'
    };
    const CANONICAL_AUDIENCES = ['All School', 'Students', 'Teachers', 'Parents', 'Staff'];
    const AUDIENCE_ALIAS = {
        'all': 'All School', 'all school': 'All School', 'all school community': 'All School',
        'student': 'Students', 'students': 'Students',
        'teacher': 'Teachers', 'teachers': 'Teachers',
        'parent': 'Parents', 'parents': 'Parents',
        'staff': 'Staff'
    };
    const DEFAULT_CLASS_OPTIONS = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    const CLASS_RELEVANT_AUDIENCES = ['All School', 'Students', 'Parents'];

    let isRedirecting = false;

    const SEED_NOTICES = [
        {
            id: 'N001',
            title: 'Annual Sports Day',
            postDate: '2026-10-05',
            expireDate: '2026-10-30',
            category: 'Events',
            audience: 'Students',
            className: '',
            status: 'Published',
            content: 'All students are informed about the upcoming Annual Sports Day.',
            createdBy: 'Admin',
            coverImage: '',
            attachmentName: '',
            attachmentSize: 0,
            attachmentData: ''
        },
        {
            id: 'N002',
            title: 'Parent Teacher Meeting',
            postDate: '2026-10-10',
            expireDate: '2026-10-31',
            category: 'Meetings',
            audience: 'Parents',
            className: '',
            status: 'Published',
            content: 'Parents are requested to attend the scheduled meeting.',
            createdBy: 'Admin',
            coverImage: '',
            attachmentName: '',
            attachmentSize: 0,
            attachmentData: ''
        }
    ];

    // dom refs
    const noticeSearchInput = document.getElementById('noticeSearchInput');
    const addNoticeBtn = document.getElementById('addNoticeBtn');
    const noticesGrid = document.getElementById('noticesGrid');
    const noticesPagination = document.getElementById('noticesPagination');
    const pageInfo = document.getElementById('pageInfo');
    const pageButtons = document.getElementById('pageButtons');

    const categoryFilter = document.getElementById('noticeCategoryFilter');
    const audienceFilter = document.getElementById('noticeAudienceFilter');
    const sortBySelect = document.getElementById('noticeSortBy');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    const statTotalEl = document.getElementById('statTotalNotices');
    const statPublishedEl = document.getElementById('statPublished');
    const statDraftsEl = document.getElementById('statDrafts');
    const statArchivedEl = document.getElementById('statArchived');

    const noticeFormModal = document.getElementById('noticeFormModal');
    const noticeFormTitle = document.getElementById('noticeFormTitle');
    const noticeFormClose = document.getElementById('noticeFormClose');
    const noticeFormCancel = document.getElementById('noticeFormCancel');
    const noticeFormReset = document.getElementById('noticeFormReset');
    const noticeForm = document.getElementById('noticeForm');
    const noticeIdHidden = document.getElementById('noticeIdHidden');

    const inputTitle = document.getElementById('inputNoticeTitle');
    const inputCategory = document.getElementById('inputNoticeCategory');
    const inputAudience = document.getElementById('inputNoticeAudience');
    const inputClass = document.getElementById('inputNoticeClass');
    const noticeClassField = document.getElementById('noticeClassField');
    const inputContent = document.getElementById('inputNoticeContent');
    const contentCharCount = document.getElementById('contentCharCount');
    const inputPostDate = document.getElementById('inputNoticePostDate');
    const inputExpDate = document.getElementById('inputNoticeExpDate');
    const inputStatus = document.getElementById('inputNoticeStatus');

    const inputCover = document.getElementById('inputNoticeCoverImage');
    const coverBtn = document.getElementById('coverImageBtn');
    const coverName = document.getElementById('coverImageName');
    const coverPreview = document.getElementById('coverImagePreview');
    const coverRemoveBtn = document.getElementById('coverImageRemoveBtn');

    const inputAttachment = document.getElementById('inputNoticeAttachment');
    const attachmentBtn = document.getElementById('attachmentBtn');
    const attachmentName = document.getElementById('attachmentName');
    const attachmentRemoveBtn = document.getElementById('attachmentRemoveBtn');

    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishNoticeBtn = document.getElementById('publishNoticeBtn');

    const viewModal = document.getElementById('noticeViewModal');
    const viewBody = document.getElementById('noticeViewBody');
    const viewClose = document.getElementById('noticeViewClose');
    const viewCloseBtn = document.getElementById('noticeViewCloseBtn');
    const viewEditBtn = document.getElementById('noticeViewEditBtn');

    const transientHint = document.getElementById('transientHint');

    (function protectPage() {
        let loggedIn = false;
        try {
            loggedIn = localStorage.getItem(STORAGE_KEY_LOGGED_IN) === 'true'
                    || sessionStorage.getItem(STORAGE_KEY_LOGGED_IN) === 'true';
        } catch (e) { loggedIn = false; }
        if (!loggedIn) {
            if (!isRedirecting) { isRedirecting = true; window.location.href = LOGIN_PAGE_URL; }
        }
    })();

    function isLoggedInNow() {
        try {
            return localStorage.getItem(STORAGE_KEY_LOGGED_IN) === 'true'
                || sessionStorage.getItem(STORAGE_KEY_LOGGED_IN) === 'true';
        } catch (e) { return false; }
    }

    function authorizeMutation() {
        if (isLoggedInNow()) return true;
        showTransientHint('You must be logged in as an administrator to manage notices.', 'error');
        return false;
    }

    /* ---------- helpers ---------- */
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        if (!transientHint) return;
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error') transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () { transientHint.classList.remove('show'); }, 2600);
    }

    function todayISO() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function formatDisplayDate(iso) {
        if (!iso) return '—';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 KB';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function truncateText(text, max) {
        const s = String(text || '');
        if (s.length <= max) return s;
        return s.slice(0, max - 1).trimEnd() + '…';
    }

    function normalizeCategory(value) {
        const raw = String(value || '').trim();
        if (!raw) return 'General';
        const mapped = CATEGORY_ALIAS[raw.toLowerCase()];
        if (mapped) return mapped;
        if (CANONICAL_CATEGORIES.indexOf(raw) !== -1) return raw;
        return raw;
    }

    function normalizeAudience(value) {
        const raw = String(value || '').trim();
        if (!raw) return 'All School';
        const mapped = AUDIENCE_ALIAS[raw.toLowerCase()];
        if (mapped) return mapped;
        if (CANONICAL_AUDIENCES.indexOf(raw) !== -1) return raw;
        return raw;
    }

    function normalizeStatus(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'draft') return 'Draft';
        if (raw === 'archived') return 'Archived';
        return 'Published';
    }

    function statusClass(status) {
        return String(status || 'published').toLowerCase().replace(/\s+/g, '-');
    }

    function categoryClass(category) {
        const c = String(category || 'general').toLowerCase();
        if (c === 'exams') return 'category-exams';
        if (c === 'holidays') return 'category-holidays';
        if (c === 'events') return 'category-events';
        if (c === 'meetings') return 'category-meetings';
        if (c === 'admissions') return 'category-admissions';
        return 'category-general';
    }

    function safeImageSrc(src) {
        if (!src) return '';
        const s = String(src).trim();
        if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s;
        if (/^(https?:\/\/|\.\/|\/)/i.test(s)) return s;
        if (/^[A-Za-z0-9_\-./]+\.(png|jpe?g|webp|gif|svg)(\?[^\s]*)?$/i.test(s)) return s;
        return '';
    }

    function safePdfDataUrl(src) {
        if (!src) return '';
        const s = String(src).trim();
        return /^data:application\/pdf;base64,[A-Za-z0-9+/=\s]+$/i.test(s) ? s : '';
    }

    /* ---------- storage ---------- */
    function normalizeNoticeRecord(n) {
        const out = (n && typeof n === 'object') ? Object.assign({}, n) : {};
        if (out.date && !out.postDate) out.postDate = out.date;
        if (out.description && !out.content) out.content = out.description;
        out.id = out.id != null ? String(out.id) : '';
        out.title = out.title != null ? String(out.title) : '';
        out.postDate = out.postDate != null ? String(out.postDate) : '';
        out.expireDate = out.expireDate != null ? String(out.expireDate) : '';
        out.category = normalizeCategory(out.category);
        out.audience = normalizeAudience(out.audience);
        out.className = out.className != null ? String(out.className) : '';
        out.status = normalizeStatus(out.status);
        out.content = out.content != null ? String(out.content) : '';
        out.createdBy = out.createdBy != null && String(out.createdBy).trim() ? String(out.createdBy) : 'Admin';
        out.coverImage = out.coverImage != null ? String(out.coverImage) : '';
        out.attachmentName = out.attachmentName != null ? String(out.attachmentName) : '';
        out.attachmentSize = parseInt(out.attachmentSize, 10) || 0;
        out.attachmentData = out.attachmentData != null ? String(out.attachmentData) : '';
        return out;
    }

    function loadNoticesFromStorage() {
        let raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY_NOTICES); } catch (e) { raw = null; }
        if (!raw) {
            try { localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(SEED_NOTICES)); } catch (e) { /* ignore */ }
            return SEED_NOTICES.map(normalizeNoticeRecord);
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Unexpected notices data shape.');
            return parsed.filter(function (n) { return n && typeof n === 'object'; }).map(normalizeNoticeRecord);
        } catch (e) {
            console.warn('[Notices] Saved notices data is malformed; starting from seed data in memory.', e);
            return SEED_NOTICES.map(normalizeNoticeRecord);
        }
    }

    function saveNoticesToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(list));
            return true;
        } catch (e) {
            console.warn('[Notices] Storage write failed.', e);
            return false;
        }
    }

    let notices = loadNoticesFromStorage();

    function loadClassOptions() {
        const options = DEFAULT_CLASS_OPTIONS.slice();
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach(function (c) {
                        const name = c && c.className ? String(c.className).trim() : '';
                        if (name && options.indexOf(name) === -1) options.push(name);
                    });
                }
            }
        } catch (e) { /* ignore */ }
        return options;
    }

    function populateClassDropdown(selectedValue) {
        if (!inputClass) return;
        inputClass.innerHTML = '<option value="">All Classes</option>';
        loadClassOptions().forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputClass.appendChild(opt);
        });
        if (selectedValue) inputClass.value = selectedValue;
    }

    function nextNoticeId() {
        let maxNum = 0;
        notices.forEach(function (n) {
            const m = /^N(\d+)$/.exec(String(n.id || ''));
            if (m) {
                const num = parseInt(m[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        return 'N' + String(maxNum + 1).padStart(3, '0');
    }

    /* ---------- filters state ---------- */
    let currentPage = 1;
    let currentCategory = 'All';
    let currentAudience = 'All';
    let currentSort = 'latest';
    let currentSearch = '';
    let viewingId = null;

    function filteredList() {
        let list = notices.slice();
        if (currentCategory && currentCategory !== 'All') {
            list = list.filter(function (n) { return n.category === currentCategory; });
        }
        if (currentAudience && currentAudience !== 'All') {
            list = list.filter(function (n) { return n.audience === currentAudience; });
        }
        const q = currentSearch.trim().toLowerCase();
        if (q) {
            list = list.filter(function (n) {
                return (n.title && n.title.toLowerCase().indexOf(q) !== -1) ||
                       (n.content && n.content.toLowerCase().indexOf(q) !== -1) ||
                       (n.category && n.category.toLowerCase().indexOf(q) !== -1) ||
                       (n.audience && n.audience.toLowerCase().indexOf(q) !== -1) ||
                       (n.createdBy && n.createdBy.toLowerCase().indexOf(q) !== -1);
            });
        }
        list.sort(function (a, b) {
            if (currentSort === 'title') {
                return String(a.title || '').localeCompare(String(b.title || ''));
            }
            const da = a.postDate || '';
            const db = b.postDate || '';
            if (currentSort === 'oldest') {
                if (da < db) return -1;
                if (da > db) return 1;
            } else {
                if (da < db) return 1;
                if (da > db) return -1;
            }
            return String(a.id).localeCompare(String(b.id));
        });
        return list;
    }

    function injectExtraFilterValues() {
        if (!categoryFilter || !audienceFilter) return;
        const seenCategories = {};
        Array.prototype.forEach.call(categoryFilter.options, function (o) { seenCategories[o.value] = true; });
        notices.forEach(function (n) {
            if (n.category && !seenCategories[n.category]) {
                const opt = document.createElement('option');
                opt.value = n.category;
                opt.textContent = n.category;
                categoryFilter.appendChild(opt);
                seenCategories[n.category] = true;
            }
        });
        const seenAudiences = {};
        Array.prototype.forEach.call(audienceFilter.options, function (o) { seenAudiences[o.value] = true; });
        notices.forEach(function (n) {
            if (n.audience && !seenAudiences[n.audience]) {
                const opt = document.createElement('option');
                opt.value = n.audience;
                opt.textContent = n.audience;
                audienceFilter.appendChild(opt);
                seenAudiences[n.audience] = true;
            }
        });
    }

    /* ---------- stats ---------- */
    function renderStats() {
        let published = 0;
        let drafts = 0;
        let archived = 0;
        notices.forEach(function (n) {
            if (n.status === 'Draft') drafts++;
            else if (n.status === 'Archived') archived++;
            else published++;
        });
        if (statTotalEl) statTotalEl.textContent = String(notices.length);
        if (statPublishedEl) statPublishedEl.textContent = String(published);
        if (statDraftsEl) statDraftsEl.textContent = String(drafts);
        if (statArchivedEl) statArchivedEl.textContent = String(archived);
    }

    /* ---------- cards ---------- */
    function closeAllMenus() {
        if (!noticesGrid) return;
        noticesGrid.querySelectorAll('.np-menu-pop.show').forEach(function (m) { m.classList.remove('show'); });
        noticesGrid.querySelectorAll('.np-menu-btn.open').forEach(function (b) { b.classList.remove('open'); });
    }

    function buildCard(n) {
        const card = document.createElement('article');
        card.className = 'notice-card';
        card.setAttribute('data-id', n.id);

        const src = safeImageSrc(n.coverImage);
        const st = n.status;
        const mediaHtml = src
            ? '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(n.title || 'Notice') + ' cover" loading="lazy">'
            : '<div class="notice-card-media-ph" aria-hidden="true"><i class="fas fa-bullhorn"></i></div>';

        const canArchive = st !== 'Archived';
        const menuHtml =
            '<div class="np-menu">' +
              '<button type="button" class="np-menu-btn" data-action="menu" data-id="' + escapeHtml(n.id) + '" aria-label="More actions" aria-haspopup="true" aria-expanded="false"><i class="fas fa-ellipsis-vertical"></i></button>' +
              '<div class="np-menu-pop">' +
                (canArchive
                  ? '<button type="button" class="np-menu-item" data-action="archive" data-id="' + escapeHtml(n.id) + '"><i class="fas fa-box-archive"></i> Archive</button>'
                  : '<button type="button" class="np-menu-item" data-action="restore" data-id="' + escapeHtml(n.id) + '"><i class="fas fa-box-open"></i> Restore</button>') +
              '</div>' +
            '</div>';

        card.innerHTML = '' +
            '<div class="notice-card-media">' + mediaHtml + '</div>' +
            '<div class="notice-card-body">' +
              '<div class="notice-card-badges">' +
                '<span class="notice-category-badge ' + categoryClass(n.category) + '">' + escapeHtml(n.category || 'General') + '</span>' +
                '<span class="status-pill ' + statusClass(st) + '">' + escapeHtml(st) + '</span>' +
              '</div>' +
              '<h3 class="notice-card-title" title="' + escapeHtml(n.title || '') + '">' + escapeHtml(n.title || '—') + '</h3>' +
              '<div class="notice-card-meta">' +
                '<span><i class="fas fa-calendar-day"></i> ' + escapeHtml(formatDisplayDate(n.postDate)) + '</span>' +
                '<span><i class="fas fa-users"></i> ' + escapeHtml(n.audience || 'All School') + '</span>' +
              '</div>' +
              '<p class="notice-card-desc">' + escapeHtml(truncateText(n.content, 150) || 'No description provided.') + '</p>' +
              '<div class="notice-card-actions">' +
                '<button type="button" class="btn-action btn-view-notice" data-action="view" data-id="' + escapeHtml(n.id) + '"><i class="fas fa-eye"></i> View Details</button>' +
                '<button type="button" class="btn-action btn-edit-notice" data-action="edit" data-id="' + escapeHtml(n.id) + '"><i class="fas fa-pen"></i> Edit</button>' +
                '<button type="button" class="btn-action btn-delete-notice" data-action="delete" data-id="' + escapeHtml(n.id) + '"><i class="fas fa-trash"></i> Delete</button>' +
                menuHtml +
              '</div>' +
            '</div>';
        return card;
    }

    function renderCards() {
        if (!noticesGrid) return;
        const list = filteredList();
        const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const start = (currentPage - 1) * PER_PAGE;
        const pageItems = list.slice(start, start + PER_PAGE);

        noticesGrid.innerHTML = '';
        if (pageItems.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state np-empty-state';
            empty.innerHTML = '<i class="fas fa-bullhorn"></i>' +
                '<div class="empty-title">No notices found.</div>' +
                '<div>Try a different search or filter, or add a new notice.</div>';
            noticesGrid.appendChild(empty);
        } else {
            pageItems.forEach(function (n) { noticesGrid.appendChild(buildCard(n)); });
        }

        const total = list.length;
        const shownStart = total === 0 ? 0 : start + 1;
        const shownEnd = Math.min(start + PER_PAGE, total);
        if (pageInfo) {
            pageInfo.textContent = total === 0
                ? 'Showing 0 of 0 notices'
                : 'Showing ' + shownStart + ' to ' + shownEnd + ' of ' + total + (total === 1 ? ' notice' : ' notices');
        }
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (!pageButtons) return;
        pageButtons.innerHTML = '';

        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'page-btn';
        prev.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
        prev.disabled = currentPage <= 1;
        prev.setAttribute('aria-label', 'Previous page');
        prev.addEventListener('click', function () { if (currentPage > 1) { currentPage--; renderCards(); } });
        pageButtons.appendChild(prev);

        let pages = [];
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        if (totalPages > 7) {
            pages = [];
            pages.push(1);
            let from = Math.max(2, currentPage - 1);
            let to = Math.min(totalPages - 1, currentPage + 1);
            if (currentPage <= 3) { from = 2; to = Math.min(5, totalPages - 1); }
            if (currentPage >= totalPages - 2) { to = totalPages - 1; from = Math.max(2, totalPages - 4); }
            if (from > 2) pages.push('…');
            for (let i = from; i <= to; i++) pages.push(i);
            if (to < totalPages - 1) pages.push('…');
            pages.push(totalPages);
        }

        pages.forEach(function (p) {
            if (p === '…') {
                const dots = document.createElement('span');
                dots.className = 'page-ellipsis';
                dots.textContent = '…';
                pageButtons.appendChild(dots);
                return;
            }
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'page-btn' + (p === currentPage ? ' active' : '');
            b.textContent = String(p);
            b.setAttribute('aria-label', 'Go to page ' + p);
            if (p === currentPage) b.setAttribute('aria-current', 'page');
            b.addEventListener('click', function () { currentPage = p; renderCards(); });
            pageButtons.appendChild(b);
        });

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'page-btn';
        next.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        next.disabled = currentPage >= totalPages;
        next.setAttribute('aria-label', 'Next page');
        next.addEventListener('click', function () { if (currentPage < totalPages) { currentPage++; renderCards(); } });
        pageButtons.appendChild(next);
    }

    function refreshAll() {
        injectExtraFilterValues();
        renderStats();
        renderCards();
    }

    /* ---------- view details modal ---------- */
    function openModal(el) {
        if (!el) return;
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        if (!el) return;
        el.classList.remove('open');
        const anyOpen = document.querySelector('.modal-overlay.open');
        if (!anyOpen) document.body.style.overflow = '';
    }

    function renderViewModal(id) {
        const n = notices.find(function (x) { return String(x.id) === String(id); });
        if (!viewBody) return;
        if (!n) {
            viewBody.innerHTML = '<div class="empty-state"><i class="fas fa-bullhorn"></i><div class="empty-title">Notice not found</div><div>This notice may have been deleted.</div></div>';
            if (viewEditBtn) viewEditBtn.disabled = true;
            return;
        }
        if (viewEditBtn) viewEditBtn.disabled = false;
        const src = safeImageSrc(n.coverImage);
        const pdf = safePdfDataUrl(n.attachmentData);

        let classRow = '';
        if (n.className) {
            classRow = '<div class="detail-item"><span class="detail-label">Class</span><span class="detail-value">' + escapeHtml(n.className) + '</span></div>';
        }

        viewBody.innerHTML = '' +
            '<div class="detail-badges">' +
              '<span class="notice-category-badge ' + categoryClass(n.category) + '">' + escapeHtml(n.category || 'General') + '</span>' +
              '<span class="status-pill ' + statusClass(n.status) + '">' + escapeHtml(n.status) + '</span>' +
              '<span class="np-audience-chip"><i class="fas fa-users"></i> ' + escapeHtml(n.audience || 'All School') + '</span>' +
            '</div>' +
            (src
              ? '<img class="detail-cover" src="' + escapeHtml(src) + '" alt="' + escapeHtml(n.title || 'Notice') + ' cover">'
              : '<div class="np-view-cover-ph" aria-hidden="true"><i class="fas fa-bullhorn"></i></div>') +
            '<h3 class="detail-title">' + escapeHtml(n.title || '—') + '</h3>' +
            '<div class="detail-grid">' +
              '<div class="detail-item"><span class="detail-label">Publish Date</span><span class="detail-value">' + escapeHtml(formatDisplayDate(n.postDate)) + '</span></div>' +
              '<div class="detail-item"><span class="detail-label">Expiry Date</span><span class="detail-value">' + escapeHtml(n.expireDate ? formatDisplayDate(n.expireDate) : '—') + '</span></div>' +
              '<div class="detail-item"><span class="detail-label">Audience</span><span class="detail-value">' + escapeHtml(n.audience || 'All School') + '</span></div>' +
              classRow +
              '<div class="detail-item"><span class="detail-label">Category</span><span class="detail-value">' + escapeHtml(n.category || 'General') + '</span></div>' +
              '<div class="detail-item"><span class="detail-label">Created By</span><span class="detail-value">' + escapeHtml(n.createdBy || 'Admin') + '</span></div>' +
            '</div>' +
            '<div class="np-view-section">' +
              '<div class="np-view-section-title"><i class="fas fa-align-left"></i> Description</div>' +
              '<p class="detail-content">' + escapeHtml(n.content || '—') + '</p>' +
            '</div>' +
            '<div class="detail-attachment">' +
              '<div class="detail-attachment-title"><i class="fas fa-paperclip"></i> Attachment</div>' +
              (n.attachmentName
                ? '<div class="attachment-row">' +
                    '<span class="attachment-name">' + escapeHtml(n.attachmentName) + '</span>' +
                    '<span class="attachment-size">' + formatFileSize(n.attachmentSize) + '</span>' +
                    (pdf
                      ? '<button type="button" class="btn-secondary btn-sm" id="downloadAttachmentBtn"><i class="fas fa-download"></i> Download</button>'
                      : '<span class="attachment-empty">Preview unavailable — re-upload the PDF to enable download.</span>') +
                  '</div>'
                : '<div class="attachment-empty">No attachment</div>') +
            '</div>';

        const dl = document.getElementById('downloadAttachmentBtn');
        if (dl && pdf) {
            dl.addEventListener('click', function () {
                const a = document.createElement('a');
                a.href = pdf;
                a.download = n.attachmentName || 'attachment.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        }
    }

    function openViewModal(id) {
        viewingId = id;
        renderViewModal(id);
        openModal(viewModal);
    }

    function closeViewModal() {
        viewingId = null;
        closeModal(viewModal);
    }

    /* ---------- form ---------- */
    const formState = {
        coverData: '',
        coverName: '',
        attachmentData: '',
        attachmentName: '',
        attachmentSize: 0
    };
    let formSnapshot = '';

    function resetFormErrors() {
        document.querySelectorAll('#noticeForm .form-field').forEach(function (f) { f.classList.remove('has-error'); });
        document.querySelectorAll('#noticeForm .field-error').forEach(function (e) { e.textContent = ''; e.classList.remove('show'); });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err = document.getElementById(errorId);
        const wrap = field ? field.closest('.form-field') : null;
        if (wrap) wrap.classList.add('has-error');
        if (err) { err.textContent = message; err.classList.add('show'); }
    }

    function updateCharCounter() {
        if (!inputContent || !contentCharCount) return;
        const len = inputContent.value.length;
        contentCharCount.textContent = len + ' / ' + MAX_CONTENT_LENGTH;
        contentCharCount.classList.toggle('over-limit', len >= MAX_CONTENT_LENGTH);
    }

    function updateClassFieldVisibility() {
        if (!noticeClassField || !inputAudience) return;
        const relevant = CLASS_RELEVANT_AUDIENCES.indexOf(inputAudience.value) !== -1;
        noticeClassField.hidden = !relevant;
        if (!relevant && inputClass) inputClass.value = '';
    }

    function renderCoverPreview() {
        if (!coverPreview || !coverName || !coverRemoveBtn) return;
        if (formState.coverData) {
            coverPreview.innerHTML = '<img src="' + escapeHtml(formState.coverData) + '" alt="Cover image preview">';
            coverName.textContent = formState.coverName || 'Cover image selected';
            coverRemoveBtn.hidden = false;
        } else {
            coverPreview.innerHTML = '';
            coverName.textContent = 'No image selected';
            coverRemoveBtn.hidden = true;
        }
    }

    function renderAttachmentState() {
        if (!attachmentName || !attachmentRemoveBtn) return;
        if (formState.attachmentName) {
            attachmentName.textContent = formState.attachmentName + ' (' + formatFileSize(formState.attachmentSize) + ')';
            attachmentRemoveBtn.hidden = false;
        } else {
            attachmentName.textContent = 'No file selected';
            attachmentRemoveBtn.hidden = true;
        }
    }

    function collectFormData() {
        return {
            id: noticeIdHidden ? noticeIdHidden.value : '',
            title: inputTitle ? inputTitle.value.trim() : '',
            category: inputCategory ? inputCategory.value : '',
            audience: inputAudience ? inputAudience.value : '',
            className: inputClass && !noticeClassField.hidden ? inputClass.value : '',
            content: inputContent ? inputContent.value.trim() : '',
            postDate: inputPostDate ? inputPostDate.value : '',
            expireDate: inputExpDate ? inputExpDate.value : '',
            status: inputStatus ? inputStatus.value : 'Published',
            coverData: formState.coverData,
            coverName: formState.coverName,
            attachmentData: formState.attachmentData,
            attachmentName: formState.attachmentName,
            attachmentSize: formState.attachmentSize
        };
    }

    function snapshotForm() {
        try { return JSON.stringify(collectFormData()); } catch (e) { return ''; }
    }

    function isFormDirty() {
        return snapshotForm() !== formSnapshot;
    }

    function clearForm() {
        if (noticeForm) noticeForm.reset();
        if (noticeIdHidden) noticeIdHidden.value = '';
        if (inputTitle) inputTitle.value = '';
        if (inputCategory) inputCategory.value = 'General';
        if (inputAudience) inputAudience.value = 'All School';
        if (inputStatus) inputStatus.value = 'Published';
        if (inputPostDate) inputPostDate.value = todayISO();
        if (inputExpDate) inputExpDate.value = '';
        if (inputContent) inputContent.value = '';
        formState.coverData = '';
        formState.coverName = '';
        formState.attachmentData = '';
        formState.attachmentName = '';
        formState.attachmentSize = 0;
        if (inputCover) inputCover.value = '';
        if (inputAttachment) inputAttachment.value = '';
        renderCoverPreview();
        renderAttachmentState();
        updateCharCounter();
        updateClassFieldVisibility();
        populateClassDropdown('');
        resetFormErrors();
    }

    function validateForm() {
        resetFormErrors();
        let ok = true;
        const data = collectFormData();

        if (!data.title) { setFieldError('inputNoticeTitle', 'error-noticeTitle', 'Notice title is required.'); ok = false; }
        else if (data.title.length > MAX_TITLE_LENGTH) { setFieldError('inputNoticeTitle', 'error-noticeTitle', 'Title must be ' + MAX_TITLE_LENGTH + ' characters or fewer.'); ok = false; }

        if (!data.category) { setFieldError('inputNoticeCategory', 'error-noticeCategory', 'Please select a category.'); ok = false; }
        if (!data.audience) { setFieldError('inputNoticeAudience', 'error-noticeAudience', 'Please select an audience.'); ok = false; }

        if (!data.content) { setFieldError('inputNoticeContent', 'error-noticeContent', 'Notice description is required.'); ok = false; }
        else if (data.content.length > MAX_CONTENT_LENGTH) { setFieldError('inputNoticeContent', 'error-noticeContent', 'Description must be ' + MAX_CONTENT_LENGTH + ' characters or fewer.'); ok = false; }

        if (!data.postDate) { setFieldError('inputNoticePostDate', 'error-noticePostDate', 'Publish date is required.'); ok = false; }
        if (data.expireDate && data.postDate && data.expireDate < data.postDate) {
            setFieldError('inputNoticeExpDate', 'error-noticeExpDate', 'Expiry date cannot be earlier than the publish date.'); ok = false;
        }
        if (!data.status || (data.status !== 'Draft' && data.status !== 'Published')) {
            setFieldError('inputNoticeStatus', 'error-noticeStatus', 'Please select a valid status.'); ok = false;
        }
        return ok;
    }

    function openFormPanel() {
        openModal(noticeFormModal);
        setTimeout(function () { if (inputTitle) inputTitle.focus(); }, 60);
    }

    function openAddNotice() {
        if (!authorizeMutation()) return;
        clearForm();
        if (noticeFormTitle) noticeFormTitle.innerHTML = '<i class="fas fa-bullhorn"></i> Add New Notice';
        if (publishNoticeBtn) publishNoticeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Notice';
        openFormPanel();
        formSnapshot = snapshotForm();
    }

    function openEditNotice(id) {
        if (!authorizeMutation()) return;
        const n = notices.find(function (x) { return String(x.id) === String(id); });
        if (!n) { showTransientHint('Notice not found.', 'error'); return; }
        clearForm();
        if (noticeIdHidden) noticeIdHidden.value = n.id;
        if (inputTitle) inputTitle.value = n.title || '';
        if (inputCategory) inputCategory.value = CANONICAL_CATEGORIES.indexOf(n.category) !== -1 ? n.category : 'General';
        if (inputAudience) inputAudience.value = CANONICAL_AUDIENCES.indexOf(n.audience) !== -1 ? n.audience : 'All School';
        updateClassFieldVisibility();
        if (inputClass) inputClass.value = n.className || '';
        if (inputPostDate) inputPostDate.value = n.postDate || todayISO();
        if (inputExpDate) inputExpDate.value = n.expireDate || '';
        if (inputContent) inputContent.value = n.content || '';
        if (inputStatus) inputStatus.value = (n.status === 'Draft' || n.status === 'Archived') ? (n.status === 'Archived' ? 'Published' : 'Draft') : 'Published';

        const coverSrc = safeImageSrc(n.coverImage);
        formState.coverData = coverSrc;
        formState.coverName = coverSrc ? (n.title ? 'Current cover image' : 'Cover image') : '';
        renderCoverPreview();

        formState.attachmentData = safePdfDataUrl(n.attachmentData);
        formState.attachmentName = n.attachmentName || '';
        formState.attachmentSize = n.attachmentSize || 0;
        renderAttachmentState();
        updateCharCounter();

        if (noticeFormTitle) noticeFormTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Notice';
        if (publishNoticeBtn) publishNoticeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Update & Publish';
        openFormPanel();
        formSnapshot = snapshotForm();
    }

    function tryCloseForm(force) {
        if (!force && isFormDirty()) {
            if (!window.confirm('You have unsaved changes. Discard them?')) return false;
        }
        closeModal(noticeFormModal);
        clearForm();
        formSnapshot = snapshotForm();
        return true;
    }

    function saveNotice(status) {
        if (!authorizeMutation()) return;
        if (!validateForm()) {
            const firstErr = document.querySelector('#noticeForm .form-field.has-error input, #noticeForm .form-field.has-error select, #noticeForm .form-field.has-error textarea');
            if (firstErr) firstErr.focus();
            return;
        }
        if (inputStatus) inputStatus.value = status;

        const editingId = noticeIdHidden ? noticeIdHidden.value : '';
        const record = {
            id: editingId || nextNoticeId(),
            title: inputTitle.value.trim(),
            category: inputCategory.value,
            audience: inputAudience.value,
            className: (CLASS_RELEVANT_AUDIENCES.indexOf(inputAudience.value) !== -1 ? (inputClass ? inputClass.value : '') : ''),
            content: inputContent.value.trim(),
            postDate: inputPostDate.value,
            expireDate: inputExpDate.value || '',
            status: status,
            createdBy: (function () {
                if (editingId) {
                    const old = notices.find(function (x) { return String(x.id) === String(editingId); });
                    if (old && old.createdBy) return old.createdBy;
                }
                let email = null;
                try { email = localStorage.getItem(STORAGE_KEY_USER_EMAIL) || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL); } catch (e) { email = null; }
                return email ? email.split('@')[0] : 'Admin';
            })(),
            coverImage: formState.coverData || '',
            attachmentName: formState.attachmentName || '',
            attachmentSize: formState.attachmentSize || 0,
            attachmentData: formState.attachmentData || ''
        };

        const nextList = notices.slice();
        if (editingId) {
            const idx = nextList.findIndex(function (x) { return String(x.id) === String(editingId); });
            if (idx === -1) { showTransientHint('Notice not found.', 'error'); return; }
            nextList[idx] = Object.assign({}, nextList[idx], record);
        } else {
            nextList.push(record);
        }

        if (!saveNoticesToStorage(nextList)) {
            showTransientHint('Could not save the notice — browser storage is full. Try a smaller image or PDF.', 'error');
            return;
        }

        notices = nextList.map(normalizeNoticeRecord);
        closeModal(noticeFormModal);
        clearForm();
        formSnapshot = snapshotForm();
        refreshAll();

        if (viewingId && String(viewingId) === String(record.id)) renderViewModal(record.id);

        if (editingId) showTransientHint('Notice updated successfully.', 'success');
        else showTransientHint(status === 'Draft' ? 'Draft saved successfully.' : 'Notice published successfully.', 'success');
    }

    /* ---------- record actions ---------- */
    function archiveNotice(id) {
        if (!authorizeMutation()) return;
        const n = notices.find(function (x) { return String(x.id) === String(id); });
        if (!n) return;
        const nextList = notices.map(function (x) {
            return String(x.id) === String(id) ? Object.assign({}, x, { status: 'Archived' }) : x;
        });
        if (!saveNoticesToStorage(nextList)) { showTransientHint('Could not archive the notice — storage write failed.', 'error'); return; }
        notices = nextList;
        refreshAll();
        if (viewingId && String(viewingId) === String(id)) renderViewModal(id);
        showTransientHint('Notice archived. It is no longer shown as a published announcement.', 'success');
    }

    function restoreNotice(id) {
        if (!authorizeMutation()) return;
        const n = notices.find(function (x) { return String(x.id) === String(id); });
        if (!n) return;
        const nextList = notices.map(function (x) {
            return String(x.id) === String(id) ? Object.assign({}, x, { status: 'Published' }) : x;
        });
        if (!saveNoticesToStorage(nextList)) { showTransientHint('Could not restore the notice — storage write failed.', 'error'); return; }
        notices = nextList;
        refreshAll();
        if (viewingId && String(viewingId) === String(id)) renderViewModal(id);
        showTransientHint('Notice restored and published.', 'success');
    }

    function deleteNotice(id) {
        if (!authorizeMutation()) return;
        const n = notices.find(function (x) { return String(x.id) === String(id); });
        if (!n) return;
        if (!window.confirm('Are you sure you want to permanently delete this notice?\n\nTitle: ' + (n.title || '(untitled)') + '\n\nThis cannot be undone.')) return;
        const nextList = notices.filter(function (x) { return String(x.id) !== String(id); });
        if (!saveNoticesToStorage(nextList)) { showTransientHint('Could not delete the notice — storage write failed.', 'error'); return; }
        notices = nextList;
        if (viewingId && String(viewingId) === String(id)) closeViewModal();
        refreshAll();
        showTransientHint('Notice deleted.', 'success');
    }

    /* ---------- event wiring: grid (delegated) ---------- */
    if (noticesGrid) {
        noticesGrid.addEventListener('click', function (e) {
            const target = e.target.closest ? e.target.closest('[data-action]') : null;
            if (!target) { closeAllMenus(); return; }
            const action = target.getAttribute('data-action');
            const id = target.getAttribute('data-id');

            if (action === 'menu') {
                const pop = target.parentElement ? target.parentElement.querySelector('.np-menu-pop') : null;
                const isOpen = pop && pop.classList.contains('show');
                closeAllMenus();
                if (pop && !isOpen) {
                    pop.classList.add('show');
                    target.classList.add('open');
                    target.setAttribute('aria-expanded', 'true');
                }
                return;
            }
            closeAllMenus();
            if (action === 'view') openViewModal(id);
            else if (action === 'edit') openEditNotice(id);
            else if (action === 'delete') deleteNotice(id);
            else if (action === 'archive') archiveNotice(id);
            else if (action === 'restore') restoreNotice(id);
        });
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest || !e.target.closest('.np-menu')) closeAllMenus();
    });

    /* ---------- event wiring: toolbar ---------- */
    if (addNoticeBtn) addNoticeBtn.addEventListener('click', openAddNotice);

    if (noticeSearchInput) {
        noticeSearchInput.addEventListener('input', function () {
            currentSearch = noticeSearchInput.value;
            currentPage = 1;
            renderCards();
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function () {
            currentCategory = categoryFilter.value;
            currentPage = 1;
            renderCards();
        });
    }
    if (audienceFilter) {
        audienceFilter.addEventListener('change', function () {
            currentAudience = audienceFilter.value;
            currentPage = 1;
            renderCards();
        });
    }
    if (sortBySelect) {
        sortBySelect.addEventListener('change', function () {
            currentSort = sortBySelect.value;
            currentPage = 1;
            renderCards();
        });
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function () {
            currentSearch = '';
            currentCategory = 'All';
            currentAudience = 'All';
            currentSort = 'latest';
            currentPage = 1;
            if (noticeSearchInput) noticeSearchInput.value = '';
            const headerSearch = document.getElementById('globalSearch');
            if (headerSearch) headerSearch.value = '';
            if (categoryFilter) categoryFilter.value = 'All';
            if (audienceFilter) audienceFilter.value = 'All';
            if (sortBySelect) sortBySelect.value = 'latest';
            renderCards();
            showTransientHint('Filters cleared.', 'success');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            if (noticeSearchInput) noticeSearchInput.value = headerSearch.value;
            currentSearch = headerSearch.value;
            currentPage = 1;
            renderCards();
        });
    }

    /* ---------- event wiring: form panel ---------- */
    if (noticeFormClose) noticeFormClose.addEventListener('click', function () { tryCloseForm(false); });
    if (noticeFormCancel) noticeFormCancel.addEventListener('click', function () { tryCloseForm(false); });
    if (noticeFormModal) {
        noticeFormModal.addEventListener('click', function (e) { if (e.target === noticeFormModal) tryCloseForm(false); });
    }
    if (noticeFormReset) {
        noticeFormReset.addEventListener('click', function () {
            if (isFormDirty() && !window.confirm('Reset the form and discard all entered information?')) return;
            const editingId = noticeIdHidden ? noticeIdHidden.value : '';
            clearForm();
            if (editingId && noticeIdHidden) noticeIdHidden.value = editingId;
            formSnapshot = snapshotForm();
            showTransientHint('Form reset.', 'success');
        });
    }
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', function () { saveNotice('Draft'); });
    if (noticeForm) {
        noticeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveNotice('Published');
        });
    }
    if (inputAudience) inputAudience.addEventListener('change', updateClassFieldVisibility);
    if (inputContent) {
        inputContent.addEventListener('input', updateCharCounter);
    }

    /* ---------- event wiring: files ---------- */
    if (coverBtn) coverBtn.addEventListener('click', function () { if (inputCover) { inputCover.value = ''; inputCover.click(); } });
    if (inputCover) {
        inputCover.addEventListener('change', function () {
            const f = inputCover.files && inputCover.files[0];
            if (!f) return;
            const errEl = document.getElementById('error-noticeCoverImage');
            if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
            if (ALLOWED_IMAGE_TYPES.indexOf(f.type) === -1) {
                if (errEl) { errEl.textContent = 'Please choose a JPG, PNG or WEBP image.'; errEl.classList.add('show'); }
                inputCover.value = '';
                return;
            }
            if (f.size > MAX_IMAGE_BYTES) {
                if (errEl) { errEl.textContent = 'Image is too large. Maximum size is 2 MB.'; errEl.classList.add('show'); }
                inputCover.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (ev) {
                const dataUrl = ev.target && ev.target.result;
                if (typeof dataUrl !== 'string' || !dataUrl) {
                    if (errEl) { errEl.textContent = 'Could not read that image. Please try again.'; errEl.classList.add('show'); }
                    return;
                }
                formState.coverData = dataUrl;
                formState.coverName = f.name;
                renderCoverPreview();
            };
            reader.onerror = function () {
                if (errEl) { errEl.textContent = 'Could not read that image. Please try again.'; errEl.classList.add('show'); }
            };
            reader.readAsDataURL(f);
        });
    }
    if (coverRemoveBtn) {
        coverRemoveBtn.addEventListener('click', function () {
            formState.coverData = '';
            formState.coverName = '';
            if (inputCover) inputCover.value = '';
            renderCoverPreview();
        });
    }

    if (attachmentBtn) attachmentBtn.addEventListener('click', function () { if (inputAttachment) { inputAttachment.value = ''; inputAttachment.click(); } });
    if (inputAttachment) {
        inputAttachment.addEventListener('change', function () {
            const f = inputAttachment.files && inputAttachment.files[0];
            if (!f) return;
            const errEl = document.getElementById('error-noticeAttachment');
            if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
            if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
                if (errEl) { errEl.textContent = 'Please choose a PDF file.'; errEl.classList.add('show'); }
                inputAttachment.value = '';
                return;
            }
            if (f.size > MAX_PDF_BYTES) {
                if (errEl) { errEl.textContent = 'PDF is too large. Maximum size is 2 MB (browser storage limit).' ; errEl.classList.add('show'); }
                inputAttachment.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (ev) {
                const dataUrl = ev.target && ev.target.result;
                if (typeof dataUrl !== 'string' || !dataUrl) {
                    if (errEl) { errEl.textContent = 'Could not read that PDF. Please try again.'; errEl.classList.add('show'); }
                    return;
                }
                formState.attachmentData = dataUrl;
                formState.attachmentName = f.name;
                formState.attachmentSize = f.size;
                renderAttachmentState();
            };
            reader.onerror = function () {
                if (errEl) { errEl.textContent = 'Could not read that PDF. Please try again.'; errEl.classList.add('show'); }
            };
            reader.readAsDataURL(f);
        });
    }
    if (attachmentRemoveBtn) {
        attachmentRemoveBtn.addEventListener('click', function () {
            formState.attachmentData = '';
            formState.attachmentName = '';
            formState.attachmentSize = 0;
            if (inputAttachment) inputAttachment.value = '';
            renderAttachmentState();
        });
    }

    /* ---------- event wiring: view modal ---------- */
    if (viewClose) viewClose.addEventListener('click', closeViewModal);
    if (viewCloseBtn) viewCloseBtn.addEventListener('click', closeViewModal);
    if (viewModal) viewModal.addEventListener('click', function (e) { if (e.target === viewModal) closeViewModal(); });
    if (viewEditBtn) viewEditBtn.addEventListener('click', function () {
        if (!viewingId) return;
        const id = viewingId;
        closeViewModal();
        openEditNotice(id);
    });

    /* ---------- keyboard ---------- */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (viewModal && viewModal.classList.contains('open')) { closeViewModal(); return; }
        if (noticeFormModal && noticeFormModal.classList.contains('open')) { tryCloseForm(false); }
    });

    /* ---------- misc ---------- */
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) notificationBtn.addEventListener('click', function () { showTransientHint('You have no new notifications.'); });

    function placeThemeToggleInSidebar() {
        const slot = document.getElementById('sidebarThemeSlot');
        const btn = document.getElementById('themeToggleBtn');
        if (slot && btn && btn.parentElement !== slot) slot.appendChild(btn);
    }

    function init() {
        if (isRedirecting) return;
        placeThemeToggleInSidebar();
        populateClassDropdown('');
        updateClassFieldVisibility();
        updateCharCounter();
        refreshAll();
        formSnapshot = snapshotForm();
    }

    init();
}
/* =============================================
   SETTINGS PAGE SPECIFIC
   ============================================= */
function initSettings() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN  = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_SETTINGS = 'schoolSettings';

    let isRedirecting = false;

    const DEFAULT_SETTINGS = {
        schoolName:    'School Management System',
        schoolPhone:   '+92 300 1234567',
        schoolEmail:   'school@example.com',
        schoolAddress: 'Buner, Khyber Pakhtunkhwa, Pakistan'
    };

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const settingsForm        = document.getElementById('settingsForm');
    const schoolNameInput     = document.getElementById('schoolNameInput');
    const schoolPhoneInput    = document.getElementById('schoolPhoneInput');
    const schoolEmailInput    = document.getElementById('schoolEmailInput');
    const schoolAddressInput  = document.getElementById('schoolAddressInput');
    const settingsResetBtn    = document.getElementById('settingsResetBtn');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadSettingsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
            return null;
        } catch (e) {
            console.warn('[Settings] Storage read failed.', e);
            return null;
        }
    }

    function saveSettingsToStorage(obj) {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(obj));
            return true;
        } catch (e) {
            console.warn('[Settings] Storage write failed.', e);
            return false;
        }
    }

    function showTransientHint(message, type) {
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function resetFormErrors() {
        document.querySelectorAll('#settingsForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#settingsForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function fillForm() {
        const saved = loadSettingsFromStorage();
        const data = saved || DEFAULT_SETTINGS;

        schoolNameInput.value    = data.schoolName    || DEFAULT_SETTINGS.schoolName;
        schoolPhoneInput.value   = data.schoolPhone   || DEFAULT_SETTINGS.schoolPhone;
        schoolEmailInput.value   = data.schoolEmail   || DEFAULT_SETTINGS.schoolEmail;
        schoolAddressInput.value = data.schoolAddress || DEFAULT_SETTINGS.schoolAddress;
    }

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const name    = schoolNameInput.value.trim();
        const phone   = schoolPhoneInput.value.trim();
        const email   = schoolEmailInput.value.trim();
        const address = schoolAddressInput.value.trim();

        if (!name) {
            setFieldError('schoolNameInput', 'error-schoolName', 'School name is required.');
            ok = false;
        }

        if (!phone) {
            setFieldError('schoolPhoneInput', 'error-schoolPhone', 'School phone is required.');
            ok = false;
        } else if (!/^[0-9+\-\s()]{7,25}$/.test(phone)) {
            setFieldError('schoolPhoneInput', 'error-schoolPhone', 'Please enter a valid phone number.');
            ok = false;
        }

        if (!email) {
            setFieldError('schoolEmailInput', 'error-schoolEmail', 'School email is required.');
            ok = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            setFieldError('schoolEmailInput', 'error-schoolEmail', 'Please enter a valid email address.');
            ok = false;
        }

        if (!address) {
            setFieldError('schoolAddressInput', 'error-schoolAddress', 'School address is required.');
            ok = false;
        }

        return ok;
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#settingsForm .form-field.has-error input, #settingsForm .form-field.has-error textarea');
                if (firstErr) firstErr.focus();
                return;
            }

            const record = {
                schoolName:    schoolNameInput.value.trim(),
                schoolPhone:   schoolPhoneInput.value.trim(),
                schoolEmail:   schoolEmailInput.value.trim(),
                schoolAddress: schoolAddressInput.value.trim()
            };

            const saved = saveSettingsToStorage(record);
            if (saved) {
                showTransientHint('School information saved successfully.', 'success');
            } else {
                showTransientHint('Could not save settings. Please try again.', 'error');
            }
        });
    }

    if (settingsResetBtn) {
        settingsResetBtn.addEventListener('click', function () {
            resetFormErrors();
            fillForm();
            showTransientHint('Form reset to last saved values.');
        });
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            /* No search target on Settings */
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        fillForm();
    }

    init();
}

/* ============================================================
   SETTINGS CONTROL CENTER
   ============================================================ */
function initSettingsControlCenter() {
    'use strict';

    const K_GENERAL      = 'schoolSettings';
    const K_PERMISSIONS  = 'settingsPermissions';
    const K_ACADEMIC     = 'settingsAcademic';
    const K_FINANCIAL    = 'settingsFinancial';
    const K_NOTIFICATIONS= 'settingsNotifications';
    const K_ATTENDANCE   = 'settingsAttendance';
    const K_APPEARANCE   = 'settingsAppearance';
    const K_SECURITY     = 'settingsSecurity';
    const K_INTEGRATIONS = 'settingsIntegrations';

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? parsed : fallback;
        } catch (e) { return fallback; }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) { return false; }
    }

    function hint(message, type) {
        let el = document.getElementById('transientHint');
        if (!el) {
            el = document.createElement('div');
            el.id = 'transientHint';
            document.body.appendChild(el);
        }
        el.classList.remove('hint-success', 'hint-error');
        if (type === 'success') el.classList.add('hint-success');
        if (type === 'error')   el.classList.add('hint-error');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._t);
        el._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
    }

    function $(id) { return document.getElementById(id); }

    function clearErrors(formId) {
        document.querySelectorAll('#' + formId + ' .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#' + formId + ' .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function fieldError(fieldId, errorId, message) {
        const field = $(fieldId);
        const err   = $(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email); }

    /* 1. GENERAL — extra fields + logo/signature uploads */
    function fillGeneralExtras() {
        const data = readJSON(K_GENERAL, {});
        if ($('schoolMottoInput'))         $('schoolMottoInput').value         = data.schoolMotto || '';
        if ($('principalNameInput'))       $('principalNameInput').value       = data.principalName || '';
        if ($('timeZoneInput'))            $('timeZoneInput').value            = data.timeZone || 'Asia/Karachi';
        if ($('currencyInput'))            $('currencyInput').value            = data.currency || 'PKR';
        if ($('academicYearStartInput'))   $('academicYearStartInput').value   = data.academicYearStart || '';
        if ($('academicYearEndInput'))     $('academicYearEndInput').value     = data.academicYearEnd || '';
        renderUploadPreview('schoolLogoPreview', data.schoolLogo, 'fas fa-school');
        renderUploadPreview('principalSignaturePreview', data.principalSignature, 'fas fa-signature');
    }

    function renderUploadPreview(previewId, dataUrl, iconClass) {
        const el = $(previewId);
        if (!el) return;
        if (dataUrl) {
            el.innerHTML = '<img src="' + dataUrl + '" alt="Uploaded image">';
            el.classList.add('has-image');
        } else {
            el.innerHTML = '<i class="' + iconClass + '"></i>';
            el.classList.remove('has-image');
        }
    }

    function bindUpload(btnId, inputId, previewId, storageProp, iconClass) {
        const btn = $(btnId), input = $(inputId);
        if (!btn || !input) return;
        btn.addEventListener('click', function () { input.click(); });
        input.addEventListener('change', function () {
            const file = input.files && input.files[0];
            if (!file) return;
            if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
                hint('Please choose a JPG, PNG, or WEBP image.', 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                hint('Image is too large. Please choose a file under 2 MB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function (ev) {
                const dataUrl = ev.target && ev.target.result;
                if (typeof dataUrl !== 'string') return;
                const data = readJSON(K_GENERAL, {});
                data[storageProp] = dataUrl;
                writeJSON(K_GENERAL, data);
                renderUploadPreview(previewId, dataUrl, iconClass);
                if (storageProp === 'schoolLogo' && typeof window.applySharedSchoolLogo === 'function') {
                    window.applySharedSchoolLogo();
                }
                hint('Image uploaded. Click Save Changes to keep all settings.', 'success');
            };
            reader.onerror = function () { hint('Could not read that image. Please try again.', 'error'); };
            reader.readAsDataURL(file);
        });
    }

    bindUpload('schoolLogoUploadBtn', 'schoolLogoFileInput', 'schoolLogoPreview', 'schoolLogo', 'fas fa-school');
    bindUpload('principalSignatureUploadBtn', 'principalSignatureFileInput', 'principalSignaturePreview', 'principalSignature', 'fas fa-signature');

    const settingsForm = $('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function () {
            const start = $('academicYearStartInput') ? $('academicYearStartInput').value : '';
            const end   = $('academicYearEndInput')   ? $('academicYearEndInput').value   : '';
            if (start && end && end < start) {
                fieldError('academicYearEndInput', 'error-academicYearEnd', 'End date must be after the start date.');
                hint('Academic year end date must be after the start date.', 'error');
                return;
            }
            const data = readJSON(K_GENERAL, {});
            data.schoolMotto        = $('schoolMottoInput')       ? $('schoolMottoInput').value.trim()       : '';
            data.principalName      = $('principalNameInput')     ? $('principalNameInput').value.trim()     : '';
            data.timeZone           = $('timeZoneInput')          ? $('timeZoneInput').value                 : 'Asia/Karachi';
            data.currency           = $('currencyInput')          ? $('currencyInput').value                 : 'PKR';
            data.academicYearStart  = start;
            data.academicYearEnd    = end;
            writeJSON(K_GENERAL, data);
        });
    }

    /* 2. USER ROLES & PERMISSIONS */
    const ROLES = ['Admin', 'Teacher', 'Student', 'Parent', 'Accountant', 'Librarian'];
    const PERMISSIONS = [
        ['viewStudents',      'View Students'],
        ['addStudents',       'Add Students'],
        ['editStudents',      'Edit Students'],
        ['deleteStudents',    'Delete Students'],
        ['viewTeachers',      'View Teachers'],
        ['manageClasses',     'Manage Classes'],
        ['manageSubjects',    'Manage Subjects'],
        ['manageAttendance',  'Manage Attendance'],
        ['manageExams',       'Manage Exams'],
        ['manageResults',     'Manage Results'],
        ['manageFees',        'Manage Fees'],
        ['manageNotices',     'Manage Notices'],
        ['accessSettings',    'Access Settings']
    ];

    const DEFAULT_PERMISSIONS = {
        Admin:      { all: true },
        Teacher:    { viewStudents: true, viewTeachers: true, manageAttendance: true, manageExams: true, manageResults: true, manageNotices: true },
        Student:    { },
        Parent:     { viewStudents: true, viewTeachers: true },
        Accountant: { viewStudents: true, manageFees: true },
        Librarian:  { viewStudents: true }
    };

    function getPermission(role, permKey, saved) {
        if (saved && saved[role] && typeof saved[role][permKey] === 'boolean') {
            return saved[role][permKey];
        }
        const def = DEFAULT_PERMISSIONS[role] || {};
        return def.all === true ? true : def[permKey] === true;
    }

    function buildPermissionsTable() {
        const table = $('permissionsTable');
        if (!table) return;
        const saved = readJSON(K_PERMISSIONS, null);

        let html = '<thead><tr><th>Permission</th>';
        ROLES.forEach(function (role) { html += '<th>' + role + '</th>'; });
        html += '</tr></thead><tbody>';

        PERMISSIONS.forEach(function (perm) {
            html += '<tr><td class="perm-name">' + perm[1] + '</td>';
            ROLES.forEach(function (role) {
                const checked = getPermission(role, perm[0], saved) ? ' checked' : '';
                html += '<td class="perm-cell">' +
                    '<span class="toggle-switch toggle-sm">' +
                        '<input type="checkbox" data-role="' + role + '" data-perm="' + perm[0] + '"' + checked + ' aria-label="' + perm[1] + ' for ' + role + '">' +
                        '<span class="toggle-slider"></span>' +
                    '</span>' +
                '</td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;
    }

    buildPermissionsTable();

    const permissionsSaveBtn = $('permissionsSaveBtn');
    if (permissionsSaveBtn) {
        permissionsSaveBtn.addEventListener('click', function () {
            const result = {};
            ROLES.forEach(function (role) { result[role] = {}; });
            document.querySelectorAll('#permissionsTable input[type="checkbox"]').forEach(function (cb) {
                result[cb.getAttribute('data-role')][cb.getAttribute('data-perm')] = cb.checked;
            });
            if (writeJSON(K_PERMISSIONS, result)) {
                hint('Permissions saved successfully.', 'success');
            } else {
                hint('Could not save permissions. Please try again.', 'error');
            }
        });
    }

    /* 3. ACADEMIC SETTINGS */
    const DEFAULT_GRADING = [
        { grade: 'A+', label: '90–100',  min: 90, max: 100 },
        { grade: 'A',  label: '80–89',   min: 80, max: 89 },
        { grade: 'B',  label: '70–79',   min: 70, max: 79 },
        { grade: 'C',  label: '60–69',   min: 60, max: 69 },
        { grade: 'D',  label: '50–59',   min: 50, max: 59 },
        { grade: 'F',  label: 'Below 50', min: 0, max: 49 }
    ];

    function buildGradingTable(rows) {
        const tbody = document.querySelector('#gradingTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(function (row, idx) {
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td><strong>' + row.grade + '</strong></td>' +
                '<td class="grading-range">' + row.label + '</td>' +
                '<td><input type="number" class="grading-input" data-idx="' + idx + '" data-field="min" min="0" max="100" value="' + row.min + '" aria-label="Min for ' + row.grade + '"></td>' +
                '<td><input type="number" class="grading-input" data-idx="' + idx + '" data-field="max" min="0" max="100" value="' + row.max + '" aria-label="Max for ' + row.grade + '"></td>';
            tbody.appendChild(tr);
        });
    }

    function fillAcademicForm() {
        const data = readJSON(K_ACADEMIC, {});
        if ($('academicYearInput'))     $('academicYearInput').value     = data.academicYear || '2025–2026';
        if ($('academicClassesInput'))  $('academicClassesInput').value  = data.classes || '6th, 7th, 8th, 9th, 10th';
        if ($('academicSectionsInput')) $('academicSectionsInput').value = data.sections || 'A, B, C';
        if ($('academicSubjectsInput')) $('academicSubjectsInput').value = data.subjects || 'Math, English, Physics, Chemistry';
        buildGradingTable(Array.isArray(data.grading) && data.grading.length === DEFAULT_GRADING.length
            ? data.grading : DEFAULT_GRADING);
        const types = Array.isArray(data.examTypes) ? data.examTypes : ['Mid Term', 'Final Term', 'Quiz', 'Assignment'];
        document.querySelectorAll('#examTypesRow input[type="checkbox"]').forEach(function (cb) {
            cb.checked = types.indexOf(cb.value) !== -1;
        });
    }

    fillAcademicForm();

    const academicForm = $('academicForm');
    if (academicForm) {
        academicForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors('academicForm');
            let ok = true;

            const year    = $('academicYearInput').value.trim();
            const classes = $('academicClassesInput').value.trim();

            if (!year)    { fieldError('academicYearInput', 'error-academicYear', 'Academic year is required.'); ok = false; }
            if (!classes) { fieldError('academicClassesInput', 'error-academicClasses', 'Classes are required.'); ok = false; }

            const grading = DEFAULT_GRADING.map(function (row) { return { grade: row.grade, label: row.label, min: row.min, max: row.max }; });
            document.querySelectorAll('#gradingTable .grading-input').forEach(function (input) {
                const idx   = parseInt(input.getAttribute('data-idx'), 10);
                const field = input.getAttribute('data-field');
                const val   = parseInt(input.value, 10);
                if (isNaN(val) || val < 0 || val > 100) {
                    input.classList.add('input-invalid');
                    ok = false;
                } else {
                    input.classList.remove('input-invalid');
                    grading[idx][field] = val;
                }
            });

            grading.forEach(function (row) {
                if (row.min > row.max) ok = false;
            });

            if (!ok) {
                hint('Please fix the highlighted academic fields.', 'error');
                return;
            }

            const examTypes = [];
            document.querySelectorAll('#examTypesRow input[type="checkbox"]:checked').forEach(function (cb) {
                examTypes.push(cb.value);
            });

            const record = {
                academicYear: year,
                classes:      classes,
                sections:     $('academicSectionsInput').value.trim(),
                subjects:     $('academicSubjectsInput').value.trim(),
                grading:      grading,
                examTypes:    examTypes
            };

            if (writeJSON(K_ACADEMIC, record)) {
                hint('Academic settings saved successfully.', 'success');
            } else {
                hint('Could not save academic settings. Please try again.', 'error');
            }
        });
    }

    /* 4. FINANCIAL SETTINGS */
    function fillFinancialForm() {
        const data = readJSON(K_FINANCIAL, {});
        if ($('tuitionFeeInput'))         $('tuitionFeeInput').value         = data.tuitionFee != null ? data.tuitionFee : '';
        if ($('transportFeeInput'))       $('transportFeeInput').value       = data.transportFee != null ? data.transportFee : '';
        if ($('examFeeInput'))            $('examFeeInput').value            = data.examFee != null ? data.examFee : '';
        if ($('otherFeesInput'))          $('otherFeesInput').value          = data.otherFees != null ? data.otherFees : '';
        if ($('financialCurrencyInput'))  $('financialCurrencyInput').value  = data.currency || 'PKR';
        if ($('taxPercentageInput'))      $('taxPercentageInput').value      = data.taxPercentage != null ? data.taxPercentage : '';
        if ($('invoicePrefixInput'))      $('invoicePrefixInput').value      = data.invoicePrefix || 'INV-';
    }

    fillFinancialForm();

    const financialForm = $('financialForm');
    if (financialForm) {
        financialForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors('financialForm');
            let ok = true;

            const tuition = $('tuitionFeeInput').value.trim();
            const tax     = $('taxPercentageInput').value.trim();

            if (!tuition) {
                fieldError('tuitionFeeInput', 'error-tuitionFee', 'Tuition fee is required.');
                ok = false;
            } else if (isNaN(Number(tuition)) || Number(tuition) < 0) {
                fieldError('tuitionFeeInput', 'error-tuitionFee', 'Please enter a valid amount.');
                ok = false;
            }

            if (tax && (isNaN(Number(tax)) || Number(tax) < 0 || Number(tax) > 100)) {
                fieldError('taxPercentageInput', 'error-taxPercentage', 'Tax must be between 0 and 100.');
                ok = false;
            }

            ['transportFeeInput', 'examFeeInput', 'otherFeesInput'].forEach(function (id) {
                const v = $(id).value.trim();
                if (v && (isNaN(Number(v)) || Number(v) < 0)) {
                    fieldError(id, 'error-' + id.replace('Input', ''), 'Please enter a valid amount.');
                    ok = false;
                }
            });

            if (!ok) {
                hint('Please fix the highlighted financial fields.', 'error');
                return;
            }

            const record = {
                tuitionFee:     tuition === '' ? null : Number(tuition),
                transportFee:   $('transportFeeInput').value.trim() === '' ? null : Number($('transportFeeInput').value),
                examFee:        $('examFeeInput').value.trim() === '' ? null : Number($('examFeeInput').value),
                otherFees:      $('otherFeesInput').value.trim() === '' ? null : Number($('otherFeesInput').value),
                currency:       $('financialCurrencyInput').value,
                taxPercentage:  tax === '' ? null : Number(tax),
                invoicePrefix:  $('invoicePrefixInput').value.trim() || 'INV-'
            };

            if (writeJSON(K_FINANCIAL, record)) {
                hint('Financial settings saved successfully.', 'success');
            } else {
                hint('Could not save financial settings. Please try again.', 'error');
            }
        });
    }

    /* 5. NOTIFICATIONS */
    function fillNotificationsForm() {
        const data = readJSON(K_NOTIFICATIONS, {});
        document.querySelectorAll('#notificationToggles input[type="checkbox"]').forEach(function (cb) {
            const key = cb.getAttribute('data-key');
            cb.checked = typeof data[key] === 'boolean' ? data[key] : true;
        });
        if ($('feeReminderTemplateInput'))  $('feeReminderTemplateInput').value  = data.feeReminderTemplate  || 'Dear Parent, the fee for {student} is due on {date}. Kindly pay before the due date.';
        if ($('absenceTemplateInput'))      $('absenceTemplateInput').value      = data.absenceTemplate      || 'Dear Parent, {student} was marked absent today. Please contact the school if this is unexpected.';
        if ($('examResultTemplateInput'))   $('examResultTemplateInput').value   = data.examResultTemplate   || 'Dear Parent, the result of {exam} for {student} has been published.';
    }

    fillNotificationsForm();

    const notificationsForm = $('notificationsForm');
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const record = {
                feeReminderTemplate: $('feeReminderTemplateInput').value.trim(),
                absenceTemplate:     $('absenceTemplateInput').value.trim(),
                examResultTemplate:  $('examResultTemplateInput').value.trim()
            };
            document.querySelectorAll('#notificationToggles input[type="checkbox"]').forEach(function (cb) {
                record[cb.getAttribute('data-key')] = cb.checked;
            });
            if (writeJSON(K_NOTIFICATIONS, record)) {
                hint('Notification settings saved successfully.', 'success');
            } else {
                hint('Could not save notification settings. Please try again.', 'error');
            }
        });
    }

    /* 6. ATTENDANCE & TIMETABLE */
    const WORKING_DAY_DEFAULTS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let holidays = [];

    function renderHolidayList() {
        const list = $('holidayList');
        if (!list) return;
        list.innerHTML = '';
        if (!holidays.length) {
            const li = document.createElement('li');
            li.className = 'holiday-empty';
            li.textContent = 'No holidays added yet.';
            list.appendChild(li);
            return;
        }
        holidays.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (h) {
            const li = document.createElement('li');
            li.className = 'holiday-item';
            const label = document.createElement('span');
            label.innerHTML = '<i class="fas fa-calendar-day"></i> <strong>' + h.date + '</strong> — ' +
                h.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'holiday-remove';
            removeBtn.innerHTML = '<i class="fas fa-xmark"></i>';
            removeBtn.setAttribute('aria-label', 'Remove holiday');
            removeBtn.addEventListener('click', function () {
                holidays = holidays.filter(function (x) { return !(x.date === h.date && x.name === h.name); });
                persistAttendanceDraft();
                renderHolidayList();
            });
            li.appendChild(label);
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
    }

    function currentAttendanceRecord() {
        const days = [];
        document.querySelectorAll('#workingDaysRow input[type="checkbox"]:checked').forEach(function (cb) {
            days.push(cb.value);
        });
        return {
            attendanceType:  $('attendanceTypeInput')   ? $('attendanceTypeInput').value   : 'Daily',
            periodDuration:  $('periodDurationInput')   ? $('periodDurationInput').value   : '45',
            schoolStartTime: $('schoolStartTimeInput')  ? $('schoolStartTimeInput').value  : '08:00',
            schoolEndTime:   $('schoolEndTimeInput')    ? $('schoolEndTimeInput').value    : '14:00',
            workingDays:     days,
            holidays:        holidays
        };
    }

    function persistAttendanceDraft() {
        writeJSON(K_ATTENDANCE, currentAttendanceRecord());
    }

    function fillAttendanceForm() {
        const data = readJSON(K_ATTENDANCE, {});
        if ($('attendanceTypeInput'))  $('attendanceTypeInput').value  = data.attendanceType || 'Daily';
        if ($('periodDurationInput'))  $('periodDurationInput').value  = data.periodDuration || '45';
        if ($('schoolStartTimeInput')) $('schoolStartTimeInput').value = data.schoolStartTime || '08:00';
        if ($('schoolEndTimeInput'))   $('schoolEndTimeInput').value   = data.schoolEndTime || '14:00';
        const days = Array.isArray(data.workingDays) ? data.workingDays : WORKING_DAY_DEFAULTS;
        document.querySelectorAll('#workingDaysRow input[type="checkbox"]').forEach(function (cb) {
            cb.checked = days.indexOf(cb.value) !== -1;
        });
        holidays = Array.isArray(data.holidays) ? data.holidays : [];
        renderHolidayList();
    }

    fillAttendanceForm();

    const addHolidayBtn = $('addHolidayBtn');
    if (addHolidayBtn) {
        addHolidayBtn.addEventListener('click', function () {
            const date = $('holidayDateInput').value;
            const name = $('holidayNameInput').value.trim();
            if (!date || !name) {
                fieldError('holidayDateInput', 'error-holidays', 'Please choose a date and enter a holiday name.');
                return;
            }
            fieldError('holidayDateInput', 'error-holidays', '');
            document.querySelectorAll('#error-holidays').forEach(function (el) { el.classList.remove('show'); });
            holidays.push({ date: date, name: name });
            $('holidayDateInput').value = '';
            $('holidayNameInput').value = '';
            persistAttendanceDraft();
            renderHolidayList();
            hint('Holiday added.', 'success');
        });
    }

    const attendanceSettingsForm = $('attendanceSettingsForm');
    if (attendanceSettingsForm) {
        attendanceSettingsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors('attendanceSettingsForm');

            const start = $('schoolStartTimeInput').value;
            const end   = $('schoolEndTimeInput').value;
            if (start && end && end <= start) {
                fieldError('schoolEndTimeInput', 'error-schoolEndTime', 'End time must be after the start time.');
                hint('School end time must be after the start time.', 'error');
                return;
            }

            if (writeJSON(K_ATTENDANCE, currentAttendanceRecord())) {
                hint('Attendance & timetable settings saved successfully.', 'success');
            } else {
                hint('Could not save attendance settings. Please try again.', 'error');
            }
        });
    }

    /* 7. APPEARANCE */
    const htmlEl = document.documentElement;

    function shadeColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const r = Math.min(255, Math.max(0, (num >> 16) + amt));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
        const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
    }

    function applyPrimaryColor(color) {
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
        htmlEl.style.setProperty('--accent', color);
        htmlEl.style.setProperty('--accent-hover', shadeColor(color, -12));
        document.querySelectorAll('#primaryColorSwatches .color-swatch').forEach(function (sw) {
            sw.classList.toggle('active', sw.getAttribute('data-color').toLowerCase() === color.toLowerCase());
        });
    }

    function syncAppearanceUI() {
        const isDark = htmlEl.getAttribute('data-theme') === 'dark';
        const lightBtn = $('appearanceLightBtn');
        const darkBtn  = $('appearanceDarkBtn');
        if (lightBtn) lightBtn.classList.toggle('active', !isDark);
        if (darkBtn)  darkBtn.classList.toggle('active', isDark);
        const expBtn = $('sidebarExpandedBtn');
        const colBtn = $('sidebarCollapsedBtn');
        const collapsed = document.body.classList.contains('sidebar-collapsed');
        if (expBtn) expBtn.classList.toggle('active', !collapsed);
        if (colBtn) colBtn.classList.toggle('active', collapsed);
    }

    function setThemeMode(mode) {
        if (mode === 'dark') {
            htmlEl.setAttribute('data-theme', 'dark');
            try { localStorage.setItem('appTheme', 'dark'); } catch (e) { /* ignore */ }
        } else {
            htmlEl.removeAttribute('data-theme');
            try { localStorage.setItem('appTheme', 'light'); } catch (e) { /* ignore */ }
        }
        const headerToggle = $('themeToggleBtn');
        if (headerToggle) {
            headerToggle.setAttribute('aria-checked', mode === 'dark' ? 'true' : 'false');
            headerToggle.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            headerToggle.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        }
        syncAppearanceUI();
    }

    function setSidebarMode(mode) {
        if (mode === 'collapsed') {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
        syncAppearanceUI();
    }

    if ($('appearanceLightBtn')) $('appearanceLightBtn').addEventListener('click', function () { setThemeMode('light'); hint('Light Mode activated.', 'success'); });
    if ($('appearanceDarkBtn'))  $('appearanceDarkBtn').addEventListener('click', function () { setThemeMode('dark'); hint('Dark Mode activated.', 'success'); });
    if ($('sidebarExpandedBtn')) $('sidebarExpandedBtn').addEventListener('click', function () { setSidebarMode('expanded'); });
    if ($('sidebarCollapsedBtn')) $('sidebarCollapsedBtn').addEventListener('click', function () { setSidebarMode('collapsed'); });

    document.querySelectorAll('#primaryColorSwatches .color-swatch').forEach(function (sw) {
        sw.addEventListener('click', function () {
            applyPrimaryColor(sw.getAttribute('data-color'));
        });
    });

    (function loadAppearance() {
        const data = readJSON(K_APPEARANCE, {});
        if (data.primaryColor) applyPrimaryColor(data.primaryColor);
        if (data.sidebarMode === 'collapsed') document.body.classList.add('sidebar-collapsed');
        if ($('languageInput')) $('languageInput').value = data.language || 'en';
        syncAppearanceUI();
    })();

    const appearanceSaveBtn = $('appearanceSaveBtn');
    if (appearanceSaveBtn) {
        appearanceSaveBtn.addEventListener('click', function () {
            const active = document.querySelector('#primaryColorSwatches .color-swatch.active');
            const record = {
                theme:        htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
                primaryColor: active ? active.getAttribute('data-color') : null,
                sidebarMode:  document.body.classList.contains('sidebar-collapsed') ? 'collapsed' : 'expanded',
                language:     $('languageInput') ? $('languageInput').value : 'en'
            };
            if (writeJSON(K_APPEARANCE, record)) {
                hint('Appearance settings saved successfully.', 'success');
            } else {
                hint('Could not save appearance settings. Please try again.', 'error');
            }
        });
    }

    /* 8. SECURITY & BACKUP */
    function fillSecurityForm() {
        const data = readJSON(K_SECURITY, {});
        if ($('minPasswordLengthInput')) $('minPasswordLengthInput').value = data.minPasswordLength != null ? data.minPasswordLength : 8;
        if ($('backupFrequencyInput'))   $('backupFrequencyInput').value   = data.backupFrequency || 'Daily';
        document.querySelectorAll('#securityForm .toggle-switch input[type="checkbox"]').forEach(function (cb) {
            const key = cb.getAttribute('data-key');
            cb.checked = typeof data[key] === 'boolean' ? data[key] : false;
        });
    }

    fillSecurityForm();

    const securityForm = $('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors('securityForm');

            const len = parseInt($('minPasswordLengthInput').value, 10);
            if (isNaN(len) || len < 4 || len > 32) {
                fieldError('minPasswordLengthInput', 'error-minPasswordLength', 'Password length must be between 4 and 32.');
                hint('Please enter a valid minimum password length (4–32).', 'error');
                return;
            }

            const record = {
                minPasswordLength: len,
                backupFrequency:   $('backupFrequencyInput').value
            };
            document.querySelectorAll('#securityForm .toggle-switch input[type="checkbox"]').forEach(function (cb) {
                record[cb.getAttribute('data-key')] = cb.checked;
            });

            if (writeJSON(K_SECURITY, record)) {
                hint('Security settings saved successfully.', 'success');
            } else {
                hint('Could not save security settings. Please try again.', 'error');
            }
        });
    }

    const auditLogsBtn = $('auditLogsBtn');
    if (auditLogsBtn) {
        auditLogsBtn.addEventListener('click', function () {
            hint('Audit logs are not recorded yet. Activity will appear here once logging is enabled.');
        });
    }

    /* 9. INTEGRATIONS */
    function renderIntegrations() {
        const data = readJSON(K_INTEGRATIONS, {});
        document.querySelectorAll('#integrationsGrid .integration-card').forEach(function (card) {
            const key = card.getAttribute('data-service');
            const connected = data[key] === true;
            const status = card.querySelector('.integration-status');
            const btn = card.querySelector('.integration-btn');
            card.classList.toggle('connected', connected);
            if (status) status.textContent = connected ? 'Connected' : 'Not Connected';
            if (btn) btn.textContent = connected ? 'Disconnect' : (key === 'paymentGateway' || key === 'smsGateway' ? 'Configure' : 'Connect');
        });
    }

    document.querySelectorAll('#integrationsGrid .integration-card').forEach(function (card) {
        const btn = card.querySelector('.integration-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            const key = card.getAttribute('data-service');
            const data = readJSON(K_INTEGRATIONS, {});
            const connected = data[key] === true;
            const name = card.querySelector('h3') ? card.querySelector('h3').textContent : key;

            if (connected) {
                data[key] = false;
                writeJSON(K_INTEGRATIONS, data);
                renderIntegrations();
                hint(name + ' disconnected.', 'success');
            } else {
                data[key] = true;
                writeJSON(K_INTEGRATIONS, data);
                renderIntegrations();
                hint(name + ' marked as connected (demo only — no external API used).', 'success');
            }
        });
    });

    renderIntegrations();

    /* 10. SYSTEM MAINTENANCE */
    function bindMaintenance(id, message, action) {
        const btn = $(id);
        if (!btn) return;
        btn.addEventListener('click', function () {
            if (!window.confirm(message)) return;
            action();
        });
    }

    (function bindClearCache() {
        const btn       = $('clearCacheBtn');
        const modal     = $('clearCacheModal');
        const closeBtn  = $('clearCacheModalClose');
        const cancelBtn = $('clearCacheCancel');
        const tempBtn   = $('clearCacheTempBtn');
        const imagesBtn = $('clearCacheImagesBtn');
        if (!btn || !modal || !tempBtn || !imagesBtn) return;

        function openConfirm() {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closeConfirm() {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }

        btn.addEventListener('click', openConfirm);
        if (closeBtn)  closeBtn.addEventListener('click', closeConfirm);
        if (cancelBtn) cancelBtn.addEventListener('click', closeConfirm);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeConfirm();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeConfirm();
        });

        function clearSessionKeepingAuth() {
            try {
                const keepLogin = sessionStorage.getItem('isLoggedIn');
                const keepEmail = sessionStorage.getItem('userEmail');
                sessionStorage.clear();
                if (keepLogin) sessionStorage.setItem('isLoggedIn', keepLogin);
                if (keepEmail) sessionStorage.setItem('userEmail', keepEmail);
            } catch (e) { /* ignore */ }
        }

        tempBtn.addEventListener('click', function () {
            clearSessionKeepingAuth();
            closeConfirm();
            hint('Cache cleared successfully.', 'success');
        });

        imagesBtn.addEventListener('click', function () {
            clearSessionKeepingAuth();
            try { localStorage.removeItem('adminProfileImage'); } catch (e) { /* ignore */ }
            if (typeof window.applySharedProfileImage === 'function') {
                window.applySharedProfileImage();
            }
            closeConfirm();
            hint('Cache cleared successfully.', 'success');
        });
    })();

    bindMaintenance('dbMaintenanceBtn', 'Run database maintenance and optimize stored records?', function () {
        hint('Database maintenance completed. All records are optimized.', 'success');
    });

    (function bindCheckUpdates() {
        const btn         = $('checkUpdatesBtn');
        const modal       = $('updatesModal');
        const closeBtn    = $('updatesModalClose');
        const cancelBtn   = $('updatesModalCancel');
        const updateNowBtn= $('updateNowBtn');
        const statusIcon  = $('updateStatusIcon');
        const statusText  = $('updateStatusText');
        const statusSub   = $('updateStatusSubtext');
        if (!btn || !modal || !statusText) return;

        const LATEST_VERSION = '1.0.0';
        let checkTimer = null;

        function getCurrentVersion() {
            try {
                return localStorage.getItem('appVersion') || '1.0.0';
            } catch (e) { return '1.0.0'; }
        }

        function openModal() {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closeModal() {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            clearTimeout(checkTimer);
        }

        function setStatus(state, title, subtitle) {
            statusText.textContent = title;
            if (statusSub) statusSub.textContent = subtitle || '';
            if (statusIcon) {
                if (state === 'checking') {
                    statusIcon.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
                    statusIcon.className = 'update-status-icon checking';
                } else if (state === 'uptodate') {
                    statusIcon.innerHTML = '<i class="fas fa-circle-check"></i>';
                    statusIcon.className = 'update-status-icon uptodate';
                } else if (state === 'available') {
                    statusIcon.innerHTML = '<i class="fas fa-circle-arrow-down"></i>';
                    statusIcon.className = 'update-status-icon available';
                }
            }
            if (updateNowBtn) updateNowBtn.hidden = state !== 'available';
        }

        btn.addEventListener('click', function () {
            openModal();
            setStatus('checking', 'Checking for updates...', 'Please wait while we check for a newer version.');

            clearTimeout(checkTimer);
            checkTimer = setTimeout(function () {
                const current = getCurrentVersion();
                if (current === LATEST_VERSION) {
                    setStatus('uptodate', 'You’re up to date!', 'School Management System v' + current + ' is the latest version.');
                } else {
                    setStatus('available', 'New update available!', 'Version ' + LATEST_VERSION + ' is ready to install (you have v' + current + ').');
                }
            }, 1400);
        });

        if (updateNowBtn) {
            updateNowBtn.addEventListener('click', function () {
                try { localStorage.setItem('appVersion', LATEST_VERSION); } catch (e) { /* ignore */ }
                setStatus('uptodate', 'You’re up to date!', 'School Management System v' + LATEST_VERSION + ' is the latest version.');
                hint('System updated successfully.', 'success');
            });
        }

        if (closeBtn)  closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
        });
    })();

    (function bindClearOldLogs() {
        const btn        = $('clearOldLogsBtn');
        const modal      = $('clearLogsModal');
        const closeBtn   = $('clearLogsModalClose');
        const cancelBtn  = $('clearLogsCancel');
        const confirmBtn = $('clearLogsConfirm');
        if (!btn || !modal || !confirmBtn) return;

        const LOG_KEYS = ['auditLogs', 'activityLogs', 'systemLogs', 'oldLogs'];

        function openConfirm() {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closeConfirm() {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }

        btn.addEventListener('click', openConfirm);
        if (closeBtn)  closeBtn.addEventListener('click', closeConfirm);
        if (cancelBtn) cancelBtn.addEventListener('click', closeConfirm);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeConfirm();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeConfirm();
        });

        confirmBtn.addEventListener('click', function () {
            try {
                LOG_KEYS.forEach(function (key) { localStorage.removeItem(key); });
            } catch (e) { /* ignore */ }
            closeConfirm();
            hint('Old logs cleared successfully.', 'success');
        });
    })();

    (function bindDatabaseMaintenance() {
        const backupBtn   = $('backupDatabaseBtn');
        const restoreBtn  = $('restoreDatabaseBtn');
        const fileInput   = $('restoreDatabaseFileInput');
        const modal       = $('restoreDbModal');
        const closeBtn    = $('restoreDbModalClose');
        const cancelBtn   = $('restoreDbCancel');
        const confirmBtn  = $('restoreDbConfirm');
        if (!backupBtn || !restoreBtn || !fileInput || !modal || !confirmBtn) return;

        let pendingRestoreData = null;

        backupBtn.addEventListener('click', function () {
            try {
                const dump = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    dump[key] = localStorage.getItem(key);
                }
                if (Object.keys(dump).length === 0) {
                    hint('There is no saved data to back up.', 'error');
                    return;
                }
                const payload = {
                    app: 'school-management-system',
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    data: dump
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const stamp = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = 'school-management-backup-' + stamp + '.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
                hint('Database backup downloaded successfully.', 'success');
            } catch (e) {
                hint('Backup failed. Please try again.', 'error');
            }
        });

        restoreBtn.addEventListener('click', function () {
            fileInput.value = '';
            fileInput.click();
        });

        fileInput.addEventListener('change', function () {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
                hint('That backup file is too large.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    let data = null;
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
                            data = parsed.data;
                        } else {
                            data = parsed;
                        }
                    }
                    if (!data || Object.keys(data).length === 0) {
                        hint('That file is not a valid backup.', 'error');
                        return;
                    }
                    pendingRestoreData = data;
                    openConfirm();
                } catch (e) {
                    hint('Could not read that backup file. Please choose a valid JSON backup.', 'error');
                }
            };
            reader.onerror = function () {
                hint('Could not read that backup file. Please try again.', 'error');
            };
            reader.readAsText(file);
        });

        function openConfirm() {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closeConfirm() {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (closeBtn)  closeBtn.addEventListener('click', closeConfirm);
        if (cancelBtn) cancelBtn.addEventListener('click', closeConfirm);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeConfirm();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeConfirm();
        });

        confirmBtn.addEventListener('click', function () {
            if (!pendingRestoreData) {
                closeConfirm();
                hint('No backup file selected.', 'error');
                return;
            }
            try {
                Object.keys(pendingRestoreData).forEach(function (key) {
                    const value = pendingRestoreData[key];
                    if (typeof value === 'string') {
                        localStorage.setItem(key, value);
                    }
                });
                pendingRestoreData = null;
                closeConfirm();
                hint('Database restored successfully.', 'success');
            } catch (e) {
                closeConfirm();
                hint('Restore failed. Your existing data was kept safe.', 'error');
            }
        });
    })();
}

/* =============================================
   ATTENDANCE PAGE SPECIFIC
   ============================================= */
function initAttendance() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_STUDENTS = 'studentsData';
    const STORAGE_KEY_CLASSES  = 'classesData';

    const STORAGE_KEY_ATTENDANCE = 'attendanceRecords';

    let isRedirecting = false;

    const STATUSES = ['Present', 'Absent', 'Leave'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const dateInput           = document.getElementById('attendanceDate');
    const classSelect         = document.getElementById('attendanceClass');
    const sectionFilterWrap   = document.getElementById('sectionFilterWrap');
    const sectionSelect       = document.getElementById('attendanceSection');
    const searchInput         = document.getElementById('attendanceSearchInput');

    const tableBody           = document.getElementById('attendanceTableBody');

    const summaryTotal        = document.getElementById('summaryTotal');
    const summaryPresent      = document.getElementById('summaryPresent');
    const summaryAbsent       = document.getElementById('summaryAbsent');
    const summaryLeave        = document.getElementById('summaryLeave');

    const saveBtn             = document.getElementById('saveAttendanceBtn');
    const resetBtn            = document.getElementById('resetAttendanceBtn');

    const transientHint       = document.getElementById('transientHint');

    let pendingSelections = {};

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadStudentsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function loadAttendanceFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
            return {};
        } catch (e) {
            console.warn('[Attendance] Storage read failed.', e);
            return {};
        }
    }

    function saveAttendanceToStorage(obj) {
        try {
            localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(obj));
        } catch (e) {
            console.warn('[Attendance] Storage write failed.', e);
        }
    }

    let attendanceData = loadAttendanceFromStorage();

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function makeAttendanceKey(date, className, section) {
        return date + '|' + className + '|' + (section || '');
    }

    function populateClassDropdown() {
        const classes = loadClassesFromStorage();
        const seen = {};
        const ordered = [];

        classes.forEach(function (c) {
            const name = c && c.className ? String(c.className) : '';
            if (name && !seen[name]) {
                seen[name] = true;
                ordered.push(name);
            }
        });

        ['5th','6th','7th','8th','9th','10th','11th','12th'].forEach(function (n) {
            if (!seen[n]) {
                seen[n] = true;
                ordered.push(n);
            }
        });

        classSelect.innerHTML = '<option value="">-- Select Class --</option>';
        ordered.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            classSelect.appendChild(opt);
        });
    }

    function updateSectionAvailability(className) {
        if (!className) {
            sectionFilterWrap.style.display = 'none';
            return;
        }
        const students = loadStudentsFromStorage().filter(function (s) {
            return String(s.className) === String(className);
        });
        const hasSections = students.some(function (s) {
            return s.section != null && String(s.section).trim() !== '';
        });

        if (hasSections) {
            const sections = {};
            students.forEach(function (s) {
                if (s.section != null && String(s.section).trim() !== '') {
                    sections[String(s.section)] = true;
                }
            });
            sectionSelect.innerHTML = '<option value="">All Sections</option>';
            Object.keys(sections).sort().forEach(function (sec) {
                const opt = document.createElement('option');
                opt.value = sec;
                opt.textContent = sec;
                sectionSelect.appendChild(opt);
            });
            sectionFilterWrap.style.display = 'flex';
        } else {
            sectionFilterWrap.style.display = 'none';
        }
    }

    function getStudentsForCurrentFilters() {
        const className = classSelect.value;
        if (!className) return [];

        const section = sectionSelect.value;

        let students = loadStudentsFromStorage().filter(function (s) {
            if (String(s.className) !== String(className)) return false;
            if (section) {
                return String(s.section || '') === String(section);
            }
            return true;
        });

        const q = searchInput.value.trim().toLowerCase();
        if (q) {
            students = students.filter(function (s) {
                return (s.name && String(s.name).toLowerCase().includes(q)) ||
                       (s.id && String(s.id).toLowerCase().includes(q));
            });
        }

        return students;
    }

    function updateSummary() {
        const students = getStudentsForCurrentFilters();
        let present = 0, absent = 0, leave = 0;

        students.forEach(function (s) {
            const sid = String(s.id || '');
            const status = pendingSelections[sid];
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Leave') leave++;
        });

        summaryTotal.textContent = students.length;
        summaryPresent.textContent = present;
        summaryAbsent.textContent = absent;
        summaryLeave.textContent = leave;
    }

    function renderAttendanceTable() {
        const className = classSelect.value;
        const section   = sectionSelect.value || '';
        const date      = dateInput.value;

        if (!className || !date) {
            tableBody.innerHTML = '';
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="4" class="empty-state">' +
                '<i class="fas fa-calendar-day"></i>' +
                'Select a date and class to load students.</td>';
            tableBody.appendChild(tr);
            if (saveBtn) saveBtn.disabled = true;
            updateSummary();
            return;
        }

        const students = getStudentsForCurrentFilters();

        if (students.length === 0) {
            tableBody.innerHTML = '';
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="4" class="empty-state">' +
                '<i class="fas fa-user-slash"></i>' +
                'No students found for this class.</td>';
            tableBody.appendChild(tr);
            if (saveBtn) saveBtn.disabled = true;
            updateSummary();
            return;
        }

        const bucketKey = makeAttendanceKey(date, className, section);
        const bucket = attendanceData[bucketKey] || {};

        students.forEach(function (s) {
            const sid = String(s.id || '');
            if (pendingSelections[sid] == null && bucket[sid] && bucket[sid].status) {
                pendingSelections[sid] = bucket[sid].status;
            }
        });

        tableBody.innerHTML = '';

        students.forEach(function (student) {
            const sid = String(student.id || '');
            const currentStatus = pendingSelections[sid] || '';

            const tr = document.createElement('tr');

            const nameTd = document.createElement('td');
            nameTd.className = 'student-name-cell';
            nameTd.innerHTML =
                escapeHtml(student.name || '—') +
                '<span class="student-sub-cell">ID: ' + escapeHtml(sid || '—') + '</span>';
            tr.appendChild(nameTd);

            STATUSES.forEach(function (status) {
                const td = document.createElement('td');
                td.className = 'status-cell';

                const label = document.createElement('label');
                label.className = 'status-radio radio-' + status.toLowerCase();
                label.title = status;

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'status-' + sid;
                input.value = status;
                input.setAttribute('data-student-id', sid);
                input.setAttribute('aria-label', status + ' for ' + (student.name || sid));
                if (currentStatus === status) {
                    input.checked = true;
                }

                input.addEventListener('change', function () {
                    pendingSelections[sid] = status;
                    updateSummary();
                });

                const dot = document.createElement('span');
                dot.className = 'dot';

                label.appendChild(input);
                label.appendChild(dot);
                td.appendChild(label);
                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });

        if (saveBtn) saveBtn.disabled = false;
        updateSummary();
    }

    function saveAttendance() {
        try {
            const className = classSelect.value;
            const section   = sectionSelect.value || '';
            const date      = dateInput.value;

            if (!date) {
                showTransientHint('Please select a date.', 'error');
                return;
            }
            if (!className) {
                showTransientHint('Please select a class.', 'error');
                return;
            }

            const students = getStudentsForCurrentFilters();
            if (students.length === 0) {
                showTransientHint('No students to save attendance for.', 'error');
                return;
            }

            let missing = 0;
            const newBucket = {};

            students.forEach(function (student) {
                const sid = String(student.id || '');
                let status = pendingSelections[sid];

                if (!status) {
                    const radio = tableBody.querySelector('input[name="status-' + sid + '"]:checked');
                    if (radio) status = radio.value;
                }

                if (!status) {
                    missing++;
                } else {
                    newBucket[sid] = {
                        studentId: sid,
                        studentName: student.name || '',
                        status: status
                    };
                }
            });

            if (missing > 0) {
                showTransientHint(
                    'Please mark attendance for all ' + students.length +
                    ' students (' + missing + ' missing).',
                    'error'
                );
                return;
            }

            const bucketKey = makeAttendanceKey(date, className, section);
            attendanceData[bucketKey] = newBucket;

            attendanceData[bucketKey].__savedAt = new Date().toISOString();

            saveAttendanceToStorage(attendanceData);

            try {
                let dashData = {};
                const raw = localStorage.getItem('dashboardAttendanceData');
                if (raw) dashData = JSON.parse(raw);
                dashData[bucketKey] = newBucket;
                localStorage.setItem('dashboardAttendanceData', JSON.stringify(dashData));
            } catch (e) { /* ignore */ }

            showTransientHint('Attendance saved successfully.', 'success');

            renderAttendanceTable();
        } catch (err) {
            console.error('[Attendance] Save failed:', err);
            showTransientHint('Save failed: ' + err.message, 'error');
        }
    }

    if (!dateInput.value) {
        dateInput.value = '2026-09-28';
    }

    populateClassDropdown();

    if (dateInput) {
        dateInput.addEventListener('change', function () {
            pendingSelections = {};
            renderAttendanceTable();
        });
    }

    if (classSelect) {
        classSelect.addEventListener('change', function () {
            sectionSelect.value = '';
            pendingSelections = {};
            updateSectionAvailability(classSelect.value);
            renderAttendanceTable();
        });
    }

    if (sectionSelect) {
        sectionSelect.addEventListener('change', function () {
            pendingSelections = {};
            renderAttendanceTable();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            renderAttendanceTable();
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', saveAttendance);

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            pendingSelections = {};
            renderAttendanceTable();
            showTransientHint('Cleared unsaved changes.');
        });
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            searchInput.value = headerSearch.value;
            renderAttendanceTable();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        updateSectionAvailability(classSelect.value);
        renderAttendanceTable();
    }

    init();
}

/* =============================================
   STUDENTS PAGE SPECIFIC
   ============================================= */
function initStudents() {
    'use strict';

    const STORAGE_KEY_LOGGED_IN = 'isLoggedIn';
    const STORAGE_KEY_USER_EMAIL = 'userEmail';
    const LOGIN_PAGE_URL = 'index.html';

    const STORAGE_KEY_STUDENTS = 'studentsData';
    const STORAGE_KEY_CLASSES  = 'classesData';

    let isRedirecting = false;

    const SEED_STUDENTS = [
        {
            id: '01',
            name: 'Ahmad',
            fatherName: 'Muhammad Ahmad',
            dob: '2008-04-12',
            gender: 'Male',
            className: '10th',
            phone: '03001234567',
            address: 'Lahore, Pakistan',
            status: 'Active'
        },
        {
            id: '02',
            name: 'Ali',
            fatherName: 'Hassan Ali',
            dob: '2009-08-22',
            gender: 'Male',
            className: '9th',
            phone: '03007654321',
            address: 'Karachi, Pakistan',
            status: 'Active'
        }
    ];

    const FALLBACK_CLASSES = ['5th','6th','7th','8th','9th','10th','11th','12th'];

    const sidebar             = document.getElementById('sidebar');
    const sidebarBackdrop     = document.getElementById('sidebarBackdrop');
    const mobileMenuBtn       = document.getElementById('mobileMenuBtn');
    const logoutBtn           = document.getElementById('logoutBtn');
    const notificationBtn     = document.getElementById('notificationBtn');
    const adminAvatar         = document.getElementById('adminAvatar');
    const adminName           = document.getElementById('adminName');

    const studentSearchInput  = document.getElementById('studentSearchInput');
    const addStudentBtn       = document.getElementById('addStudentBtn');
    const studentsTableBody   = document.getElementById('studentsTableBody');

    const studentFormModal    = document.getElementById('studentFormModal');
    const studentFormTitle    = document.getElementById('studentFormTitle');
    const studentFormClose    = document.getElementById('studentFormClose');
    const studentFormCancel   = document.getElementById('studentFormCancel');
    const studentForm         = document.getElementById('studentForm');
    const studentFormSubmit   = document.getElementById('studentFormSubmit');
    const studentIdHidden     = document.getElementById('studentIdHidden');

    const inputName           = document.getElementById('inputName');
    const inputFather         = document.getElementById('inputFather');
    const inputDob            = document.getElementById('inputDob');
    const inputGender         = document.getElementById('inputGender');
    const inputClass          = document.getElementById('inputClass');
    const inputPhone          = document.getElementById('inputPhone');
    const inputAddress        = document.getElementById('inputAddress');
    const inputStatus         = document.getElementById('inputStatus');

    const inputMonthlyFee     = document.getElementById('inputMonthlyFee');
    const inputFeeType        = document.getElementById('inputFeeType');
    const inputMonthlyFeeTotal = document.getElementById('inputMonthlyFeeTotal');
    const feeCalcHint         = document.getElementById('feeCalcHint');

    const viewStudentModal    = document.getElementById('viewStudentModal');
    const viewStudentClose    = document.getElementById('viewStudentClose');
    const viewStudentDone     = document.getElementById('viewStudentDone');
    const viewStudentDetails  = document.getElementById('viewStudentDetails');

    const transientHint       = document.getElementById('transientHint');

    (function protectPage() {
        let isLoggedIn = false;
        try {
            const persistent = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
            const session    = sessionStorage.getItem(STORAGE_KEY_LOGGED_IN);
            isLoggedIn = persistent === 'true' || session === 'true';
        } catch (e) { isLoggedIn = false; }

        if (!isLoggedIn) {
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = LOGIN_PAGE_URL;
            }
        }
    })();

    function loadStudentsFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(SEED_STUDENTS));
                return SEED_STUDENTS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('Bad shape');
            return parsed;
        } catch (e) {
            console.warn('[Students] Storage read failed, using seed data.', e);
            return SEED_STUDENTS.slice();
        }
    }

    function saveStudentsToStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(list));
        } catch (e) {
            console.warn('[Students] Storage write failed.', e);
        }
    }

    function loadClassesFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (c) {
                return c && c.className ? c.className : '';
            }).filter(Boolean);
        } catch (e) { return []; }
    }

    let students = loadStudentsFromStorage();

    function nextStudentId() {
        let maxNum = 0;
        students.forEach(function (s) {
            const n = parseInt(s.id, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const next = maxNum + 1;
        return next < 10 ? '0' + next : String(next);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTransientHint(message, type) {
        if (!transientHint) return;
        transientHint.classList.remove('hint-success', 'hint-error');
        if (type === 'success') transientHint.classList.add('hint-success');
        if (type === 'error')   transientHint.classList.add('hint-error');
        transientHint.textContent = message;
        transientHint.classList.add('show');
        clearTimeout(showTransientHint._t);
        showTransientHint._t = setTimeout(function () {
            transientHint.classList.remove('show');
        }, 2400);
    }

    function populateClassDropdown(selectedValue) {
        inputClass.innerHTML = '<option value="">-- Select Class --</option>';

        const standardClasses = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

        let storedClasses = loadClassesFromStorage();
        const uniqueStored = [...new Set(storedClasses)];

        let classes = standardClasses.slice();
        uniqueStored.forEach(function (c) {
            if (classes.indexOf(c) === -1) classes.push(c);
        });

        const classOrder = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
        classes.sort(function (a, b) {
            const indexA = classOrder.indexOf(a);
            const indexB = classOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        if (selectedValue && classes.indexOf(selectedValue) === -1) classes.push(selectedValue);
        classes.forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            inputClass.appendChild(opt);
        });
        if (selectedValue) inputClass.value = selectedValue;
    }

    function updateFeePreview() {
        if (!inputClass) return;

        const className = inputClass.value;
        const feeType   = inputFeeType ? inputFeeType.value : '';
        const classFee  = getMonthlyFeeForClass(className);

        if (inputMonthlyFee) {
            inputMonthlyFee.value = className ? sfFormatAmount(classFee) : '';
        }

        const monthlyFee = calculateMonthlyFee(className, feeType);
        if (inputMonthlyFeeTotal) {
            inputMonthlyFeeTotal.value = (className && feeType) ? sfFormatAmount(monthlyFee) : '';
        }

        if (feeCalcHint) {
            if (!className) {
                feeCalcHint.textContent = 'Select a class to see its monthly fee.';
            } else if (!feeType) {
                feeCalcHint.textContent = 'Monthly fee for ' + className + ' is PKR ' +
                                          sfFormatAmount(classFee) + '. Select a fee type.';
            } else {
                const typeInfo = STUDENT_FEE_TYPES.find(function (t) { return t.value === feeType; });
                feeCalcHint.textContent = className + ' · ' + feeType + ' (' +
                    (typeInfo ? typeInfo.percent : 100) + '%) = PKR ' +
                    sfFormatAmount(monthlyFee) + ' per month';
            }
        }

        return monthlyFee;
    }

    if (inputClass) inputClass.addEventListener('change', updateFeePreview);
    if (inputFeeType) inputFeeType.addEventListener('change', updateFeePreview);

    function renderStudentsTable(list) {
        studentsTableBody.innerHTML = '';

        if (!list || list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="8" class="empty-state">' +
                '<i class="fas fa-user-slash"></i>' +
                'No students found.</td>';
            studentsTableBody.appendChild(tr);
            return;
        }

        list.forEach(function (student) {
            const tr = document.createElement('tr');

            const feeType    = getStudentEffectiveFeeType(student);
            const monthlyFee = getStudentMonthlyFee(student);

            tr.appendChild(td(student.id));
            tr.appendChild(td(student.name));
            tr.appendChild(td(student.className));
            tr.appendChild(td(feeType));

            const feeTd = document.createElement('td');
            feeTd.className = 'right';
            feeTd.textContent = sfFormatAmount(monthlyFee);
            tr.appendChild(feeTd);

            tr.appendChild(td(student.phone || '—'));

            const statusTd = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'status-pill ' + (student.status === 'Inactive' ? 'inactive' : 'active');
            pill.textContent = student.status || 'Active';
            statusTd.appendChild(pill);
            tr.appendChild(statusTd);

            const actionTd = document.createElement('td');
            const actionMenu = document.createElement('div');
            actionMenu.className = 'action-menu';

            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = 'action-menu-btn';
            menuBtn.setAttribute('aria-label', 'More actions');
            menuBtn.setAttribute('aria-haspopup', 'true');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = '<i class="fas fa-ellipsis-vertical"></i>';

            const dropdown = document.createElement('div');
            dropdown.className = 'action-menu-dropdown';
            dropdown.setAttribute('role', 'menu');

            const viewItem = document.createElement('button');
            viewItem.type = 'button';
            viewItem.className = 'action-menu-item';
            viewItem.setAttribute('role', 'menuitem');
            viewItem.innerHTML = '<i class="fas fa-eye"></i> View';
            viewItem.addEventListener('click', function () {
                openViewStudent(student.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const editItem = document.createElement('button');
            editItem.type = 'button';
            editItem.className = 'action-menu-item';
            editItem.setAttribute('role', 'menuitem');
            editItem.innerHTML = '<i class="fas fa-pen"></i> Edit';
            editItem.addEventListener('click', function () {
                openEditStudent(student.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const deleteItem = document.createElement('button');
            deleteItem.type = 'button';
            deleteItem.className = 'action-menu-item delete';
            deleteItem.setAttribute('role', 'menuitem');
            deleteItem.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteItem.addEventListener('click', function () {
                handleDeleteStudent(student.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            const feeCardItem = document.createElement('button');
            feeCardItem.type = 'button';
            feeCardItem.className = 'action-menu-item';
            feeCardItem.setAttribute('role', 'menuitem');
            feeCardItem.innerHTML = '<i class="fas fa-money-check-dollar"></i> Fee Card';
            feeCardItem.addEventListener('click', function () {
                sfOpenStudentFeeCard(student.id);
                dropdown.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            });

            dropdown.appendChild(viewItem);
            dropdown.appendChild(editItem);
            dropdown.appendChild(deleteItem);
            dropdown.appendChild(feeCardItem);

            actionMenu.appendChild(menuBtn);
            actionMenu.appendChild(dropdown);
            actionTd.appendChild(actionMenu);

            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (openDropdown) {
                    if (openDropdown !== dropdown) {
                        openDropdown.classList.remove('show');
                        const otherBtn = openDropdown.previousElementSibling;
                        if (otherBtn && otherBtn.classList.contains('action-menu-btn')) {
                            otherBtn.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
                const isOpen = dropdown.classList.toggle('show');
                menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                if (isOpen) positionActionDropdown(dropdown, menuBtn);
            });

            tr.appendChild(actionTd);

            studentsTableBody.appendChild(tr);
        });
    }

    function td(text) {
        const cell = document.createElement('td');
        cell.textContent = text == null ? '' : text;
        return cell;
    }

    function handleSearch() {
        const q = studentSearchInput.value.trim().toLowerCase();

        if (!q) {
            renderStudentsTable(students);
            return;
        }

        const filtered = students.filter(function (s) {
            return (s.id && String(s.id).toLowerCase().includes(q)) ||
                   (s.name && s.name.toLowerCase().includes(q)) ||
                   (s.className && s.className.toLowerCase().includes(q)) ||
                   (s.phone && String(s.phone).toLowerCase().includes(q)) ||
                   (s.status && s.status.toLowerCase().includes(q)) ||
                   (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
                   (getStudentEffectiveFeeType(s).toLowerCase().includes(q));
        });

        renderStudentsTable(filtered);
    }

    if (studentSearchInput) studentSearchInput.addEventListener('input', handleSearch);

    function resetFormErrors() {
        document.querySelectorAll('#studentForm .form-field').forEach(function (f) {
            f.classList.remove('has-error');
        });
        document.querySelectorAll('#studentForm .field-error').forEach(function (e) {
            e.textContent = '';
            e.classList.remove('show');
        });
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const err   = document.getElementById(errorId);
        if (field) field.classList.add('has-error');
        if (err) {
            err.textContent = message;
            err.classList.add('show');
        }
    }

    function clearForm() {
        studentForm.reset();
        studentIdHidden.value = '';
        if (inputStatus) inputStatus.value = 'Active';
        if (inputFeeType) inputFeeType.value = STUDENT_DEFAULT_FEE_TYPE;
        if (inputMonthlyFee) inputMonthlyFee.value = '';
        if (inputMonthlyFeeTotal) inputMonthlyFeeTotal.value = '';
        if (feeCalcHint) feeCalcHint.textContent = '';
        resetFormErrors();
        updateFeePreview();
    }

    function openAddStudent() {
        clearForm();
        populateClassDropdown(null);
        studentFormTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add New Student';
        studentFormSubmit.innerHTML = '<i class="fas fa-plus"></i> Add Student';
        openModal(studentFormModal);
        setTimeout(function () { inputName.focus(); }, 50);
    }

    function openEditStudent(studentId) {
        const student = students.find(function (s) { return String(s.id) === String(studentId); });
        if (!student) return;

        clearForm();
        studentIdHidden.value   = student.id;
        inputName.value         = student.name || '';
        inputFather.value       = student.fatherName || '';
        inputDob.value          = student.dob || '';
        inputGender.value       = student.gender || '';
        populateClassDropdown(student.className || '');
        inputPhone.value        = student.phone || '';
        inputAddress.value      = student.address || '';
        inputStatus.value       = student.status || 'Active';
        if (inputFeeType) inputFeeType.value = getStudentEffectiveFeeType(student);
        updateFeePreview();

        studentFormTitle.innerHTML = '<i class="fas fa-user-pen"></i> Edit Student';
        studentFormSubmit.innerHTML = '<i class="fas fa-check"></i> Update Student';
        openModal(studentFormModal);
        setTimeout(function () { inputName.focus(); }, 50);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (addStudentBtn) addStudentBtn.addEventListener('click', openAddStudent);
    if (studentFormClose) studentFormClose.addEventListener('click', function () { closeModal(studentFormModal); clearForm(); });
    if (studentFormCancel) studentFormCancel.addEventListener('click', function () { closeModal(studentFormModal); clearForm(); });

    if (studentFormModal) {
        studentFormModal.addEventListener('click', function (e) {
            if (e.target === studentFormModal) { closeModal(studentFormModal); clearForm(); }
        });
    }
    if (viewStudentModal) {
        viewStudentModal.addEventListener('click', function (e) {
            if (e.target === viewStudentModal) closeModal(viewStudentModal);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (studentFormModal && studentFormModal.classList.contains('open')) { closeModal(studentFormModal); clearForm(); }
        if (viewStudentModal && viewStudentModal.classList.contains('open')) closeModal(viewStudentModal);
    });

    function validateForm() {
        resetFormErrors();
        let ok = true;

        const name    = inputName.value.trim();
        const father  = inputFather.value.trim();
        const dob     = inputDob.value;
        const gender  = inputGender.value;
        const cls     = inputClass.value;
        const phone   = inputPhone.value.trim();
        const address = inputAddress.value.trim();
        const status  = inputStatus.value;
        const feeType = inputFeeType ? inputFeeType.value : '';

        if (!name) { setFieldError('inputName', 'error-name', 'Please enter the student name.'); ok = false; }
        if (!father) { setFieldError('inputFather', 'error-father', 'Please enter the father name.'); ok = false; }

        if (!dob) {
            setFieldError('inputDob', 'error-dob', 'Please select the date of birth.');
            ok = false;
        } else {
            const today = new Date();
            const dobDate = new Date(dob);
            if (isNaN(dobDate.getTime()) || dobDate > today) {
                setFieldError('inputDob', 'error-dob', 'Please enter a valid date of birth.');
                ok = false;
            }
        }

        if (!gender) { setFieldError('inputGender', 'error-gender', 'Please select a gender.'); ok = false; }
        if (!cls) { setFieldError('inputClass', 'error-class', 'Please select a class.'); ok = false; }

        if (!feeType) {
            setFieldError('inputFeeType', 'error-feeType', 'Please select a fee type.');
            ok = false;
        } else if (getStudentFeeTypePercent(feeType) === undefined) {
            setFieldError('inputFeeType', 'error-feeType', 'Please select a valid fee type.');
            ok = false;
        }

        if (!phone) {
            setFieldError('inputPhone', 'error-phone', 'Please enter a phone number.');
            ok = false;
        } else if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
            setFieldError('inputPhone', 'error-phone', 'Please enter a valid phone number.');
            ok = false;
        }

        if (!address) { setFieldError('inputAddress', 'error-address', 'Please enter the address.'); ok = false; }
        if (!status) { setFieldError('inputStatus', 'error-status', 'Please select a status.'); ok = false; }

        return ok;
    }

    if (studentForm) {
        studentForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateForm()) {
                const firstErr = document.querySelector('#studentForm .form-field.has-error input, #studentForm .form-field.has-error select, #studentForm .form-field.has-error textarea');
                if (firstErr) firstErr.focus();
                return;
            }

            const editingId = studentIdHidden.value;

            const record = {
                id:         editingId || nextStudentId(),
                name:       inputName.value.trim(),
                fatherName: inputFather.value.trim(),
                dob:        inputDob.value,
                gender:     inputGender.value,
                className:  inputClass.value,
                phone:      inputPhone.value.trim(),
                address:    inputAddress.value.trim(),
                status:     inputStatus.value || 'Active',
                feeType:    inputFeeType ? inputFeeType.value : STUDENT_DEFAULT_FEE_TYPE,
                monthlyFee: calculateMonthlyFee(inputClass.value, inputFeeType ? inputFeeType.value : STUDENT_DEFAULT_FEE_TYPE)
            };

            if (editingId) {
                const idx = students.findIndex(function (s) { return String(s.id) === String(editingId); });
                if (idx !== -1) students[idx] = record;
                showTransientHint('Student updated successfully.', 'success');
            } else {
                students.push(record);
                if (studentSearchInput) studentSearchInput.value = '';
                showTransientHint('New student added successfully.', 'success');
            }

            saveStudentsToStorage(students);
            sfSyncStudentFeeRecord(record);
            renderStudentsTable(students);

            if (studentSearchInput.value.trim()) handleSearch();

            closeModal(studentFormModal);
            clearForm();
        });
    }

    function openViewStudent(studentId) {
        const student = students.find(function (s) { return String(s.id) === String(studentId); });
        if (!student) return;

        const rows = [
            ['Student ID',   student.id],
            ['Student Name', student.name],
            ['Father Name',  student.fatherName],
            ['Date of Birth', student.dob || '—'],
            ['Gender',       student.gender || '—'],
            ['Class',        student.className || '—'],
            ['Fee Type',     getStudentEffectiveFeeType(student)],
            ['Monthly Fee',  sfFormatAmount(getStudentMonthlyFee(student)) + ' PKR'],
            ['Phone',        student.phone || '—'],
            ['Status',       student.status || 'Active'],
            ['Address',      student.address || '—']
        ];

        viewStudentDetails.innerHTML = rows.map(function (row) {
            const isFull = row[0] === 'Address';
            return '' +
                '<div class="detail-item' + (isFull ? ' full' : '') + '">' +
                    '<span class="detail-label">' + escapeHtml(row[0]) + '</span>' +
                    '<span class="detail-value">' + escapeHtml(row[1]) + '</span>' +
                '</div>';
        }).join('');

        openModal(viewStudentModal);
    }

    if (viewStudentClose) viewStudentClose.addEventListener('click', function () { closeModal(viewStudentModal); });
    if (viewStudentDone) viewStudentDone.addEventListener('click', function () { closeModal(viewStudentModal); });

    function handleDeleteStudent(studentId) {
        const student = students.find(function (s) { return String(s.id) === String(studentId); });
        if (!student) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this student?\n\n' +
            'Name: ' + student.name + '\n' +
            'Class: ' + (student.className || '—')
        );
        if (!confirmed) return;

        students = students.filter(function (s) { return String(s.id) !== String(studentId); });
        saveStudentsToStorage(students);

        if (studentSearchInput.value.trim()) {
            handleSearch();
        } else {
            renderStudentsTable(students);
        }

        showTransientHint('Student deleted successfully.', 'success');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('show');
    }

    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) closeSidebar();
    });

    const placeholderLinks = sidebar ? sidebar.querySelectorAll('a[data-page]') : [];
    placeholderLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            placeholderLinks.forEach(function (l) { l.parentElement.classList.remove('active'); });
            link.parentElement.classList.add('active');
            closeSidebar();
            showTransientHint('This page is not implemented in the demo yet.');
        });
    });

    function handleLogout() {
        try {
            localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
            sessionStorage.removeItem(STORAGE_KEY_LOGGED_IN);
            sessionStorage.removeItem(STORAGE_KEY_USER_EMAIL);
        } catch (e) { /* ignore */ }
        isRedirecting = true;
        try { sessionStorage.setItem('__just_logged_out', '1'); } catch (e) { /* ignore */ }
        window.location.href = LOGIN_PAGE_URL;
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    function loadAdminInfo() {
        let email = null;
        let savedName = null;
        try {
            email = localStorage.getItem(STORAGE_KEY_USER_EMAIL)
                 || sessionStorage.getItem(STORAGE_KEY_USER_EMAIL);
            savedName = localStorage.getItem('adminDisplayName');
        } catch (e) { /* ignore */ }

        const fallbackName = email ? email.split('@')[0] : 'Admin';
        const displayName  = (savedName && savedName.trim()) || fallbackName;

        if (email) {
            const initial = email.trim().charAt(0).toUpperCase() || 'A';
            adminAvatar.innerHTML = '<span>' + initial + '</span>';
            adminName.textContent = displayName;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
            adminName.textContent = displayName;
        }
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
            showTransientHint('You have no new notifications.');
        });
    }

    const headerSearch = document.getElementById('globalSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', function () {
            studentSearchInput.value = headerSearch.value;
            handleSearch();
        });
    }

    function init() {
        if (isRedirecting) return;
        loadAdminInfo();
        renderStudentsTable(students);

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.action-menu')) {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.action-menu-dropdown.show').forEach(function (dropdown) {
                    dropdown.classList.remove('show');
                    const menuBtn = dropdown.previousElementSibling;
                    if (menuBtn && menuBtn.classList.contains('action-menu-btn')) {
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    }

    init();
}

/* ============================================================
   DASHBOARD - ADD STUDENT BUTTON FIX
   ============================================================ */
(function initDashboardAddStudent() {
    'use strict';

    const openBtn    = document.getElementById('addStudentBtn');
    const overlay    = document.getElementById('addStudentOverlay');
    const closeBtn   = document.getElementById('addStudentClose');
    const cancelBtn  = document.getElementById('addStudentCancel');

    if (!openBtn || !overlay) return;

    function openModal() {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        const firstInput = document.getElementById('addStudentName');
        if (firstInput) setTimeout(function () { firstInput.focus(); }, 50);
    }

    function closeModal() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
    });

    if (closeBtn)  closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    if (overlay.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    }
})();






































































