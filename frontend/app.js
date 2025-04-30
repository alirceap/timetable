let teachersData = [];
let rooms = [];
let hardConstraints = [];
let softConstraints = [];

// دالة لإضافة قيد صلب
function addHardConstraint(constraintFn) {
    hardConstraints.push(constraintFn);
}

// دالة لإضافة قيد مرن
function addSoftConstraint(constraintFn) {
    softConstraints.push(constraintFn);
}

// قيد يدوي مضاف من المستخدم (نصي)
function applyCustomConstraint() {
    const text = document.getElementById("customConstraint").value.trim();
    if (!text) return alert("يرجى كتابة قيد صالح.");

    // مثال ذكي: "لا يُسمح للمدرس 'أحمد' بالتدريس يوم الأحد الساعة 9"
    const match = text.match(/'(.+)'[\s\S]*?يوم\s+(\S+)\s+الساعة\s+(\d+)/);
    if (match) {
        const name = match[1];
        const day = match[2];
        const hour = parseInt(match[3]);

        addHardConstraint((schedule, entry) => {
            return !(entry.teacher === name && entry.day === day && entry.hours.includes(hour));
        });

        alert("تم إضافة القيد بنجاح.");
    } else {
        alert("تنسيق القيد غير مدعوم حالياً.");
    }
}

// خلط عشوائي
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function splitDuration(duration) {
    if (duration === 1) return [[1]];
    const splits = [];
    function recurse(remain, current) {
        if (remain === 0) splits.push(current);
        for (let i = 1; i <= 2; i++) {
            if (i <= remain) recurse(remain - i, [...current, i]);
        }
    }
    recurse(duration, []);
    return splits.sort((a, b) => a.length - b.length);
}

function generateAvailabilityGrid() {
    const grid = document.getElementById('availabilityGrid');
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);
    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء"];
    let html = "<table><thead><tr><th>اليوم/الساعة</th>";
    hours.forEach(h => html += `<th>${h}:00</th>`);
    html += "</tr></thead><tbody>";

    days.forEach(day => {
        html += `<tr><td>${day}</td>`;
        hours.forEach(h => {
            html += `<td><input type="checkbox" data-day="${day}" data-hour="${h}"></td>`;
        });
        html += "</tr>";
    });

    html += "</tbody></table>";
    grid.innerHTML = html;
}

window.onload = generateAvailabilityGrid;

function addRoom() {
    const room = document.getElementById("roomInput").value.trim();
    if (room && !rooms.includes(room)) {
        rooms.push(room);
        renderRooms();
        document.getElementById("roomInput").value = '';
    }
}

function renderRooms() {
    const list = document.getElementById("roomsList");
    list.innerHTML = "";
    rooms.forEach((r, i) => {
        const li = document.createElement("li");
        li.textContent = r + " ";
        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.onclick = () => {
            rooms.splice(i, 1);
            renderRooms();
        };
        li.appendChild(btn);
        list.appendChild(li);
    });
}

function addTeacher() {
    const name = document.getElementById('teacherName').value.trim();
    const subject = document.getElementById('subjectName').value.trim();
    const lessons = parseInt(document.getElementById('requiredLessons').value);
    const duration = parseInt(document.getElementById('lessonDuration').value);

    if (!name || !subject || isNaN(lessons) || isNaN(duration)) {
        alert("يرجى إدخال كل البيانات.");
        return;
    }

    const availability = {};
    document.querySelectorAll('#availabilityGrid input:checked').forEach(input => {
        const day = input.dataset.day;
        const hour = parseInt(input.dataset.hour);
        if (!availability[day]) availability[day] = [];
        availability[day].push(hour);
    });

    teachersData.push({ name, subject, lessons, duration, availability });
    renderTeachersTable();
}

function renderTeachersTable() {
    const tbody = document.querySelector("#teachersTable tbody");
    tbody.innerHTML = "";
    teachersData.forEach((t, i) => {
        tbody.innerHTML += `<tr>
            <td>${t.name}</td><td>${t.subject}</td><td>${t.lessons}</td>
            <td>${t.duration}</td>
            <td><button onclick="removeTeacher(${i})">❌</button></td>
        </tr>`;
    });
}

function removeTeacher(index) {
    teachersData.splice(index, 1);
    renderTeachersTable();
}

function isConflict(schedule, day, hour, room, teacherName) {
    return schedule.some(s => s.day === day && s.hour === hour &&
        (s.room === room || s.teacher === teacherName));
}

function checkHardConstraints(schedule, entry) {
    for (const constraint of hardConstraints) {
        if (!constraint(schedule, entry)) {
            return false;
        }
    }
    return true;
}

function evaluateSoftConstraints(schedule) {
    let score = 0;
    for (const constraint of softConstraints) {
        score += constraint(schedule);
    }
    return score;
}

// الترتيب الذكي + توليد جدول واحد
function generate() {
    const days = document.getElementById('daysInput').value.split(',').map(d => d.trim());
    const start = parseInt(document.getElementById('startHour').value);
    const end = parseInt(document.getElementById('endHour').value);
    const sortedTeachers = [...teachersData].sort((a, b) => {
        const aAvail = Object.values(a.availability).flat().length;
        const bAvail = Object.values(b.availability).flat().length;
        if (aAvail === bAvail) return b.lessons - a.lessons;
        return aAvail - bAvail;
    });

    const schedule = findSchedule(sortedTeachers, days, start, end, [], 0); // تمرير مستوى التراجع
    renderSchedule('finalSchedule', schedule, start, end, days);
    document.getElementById("scheduleScore").textContent = schedule ? `✅ جودة الجدول: ${evaluateSoftConstraints(schedule)}` : '';
}

// توليد جداول متعددة واختيار الأفضل
function generateBest() {
    const days = document.getElementById('daysInput').value.split(',').map(d => d.trim());
    const start = parseInt(document.getElementById('startHour').value);
    const end = parseInt(document.getElementById('endHour').value);

    let bestSchedule = null;
    let bestScore = -Infinity;

    for (let i = 0; i < 10; i++) {
        const shuffled = shuffle([...teachersData]);
        const result = findSchedule(shuffled, days, start, end, [], 0); // تمرير مستوى التراجع
        const score = result ? evaluateSoftConstraints(result) : -Infinity;
        if (score > bestScore) {
            bestScore = score;
            bestSchedule = result;
        }
    }

    renderSchedule('finalSchedule', bestSchedule, start, end, days);
    document.getElementById("scheduleScore").textContent = bestSchedule ? `🏆 أفضل جدول بجودة: ${bestScore}` : '❌ لم يتم توليد جدول ناجح.';
}

function findSchedule(teachers, days, start, end, currentSchedule, backtrackLevel) {
    if (teachers.length === 0) return currentSchedule;

    const teacher = teachers[0];
    const rest = teachers.slice(1);
    const lessonPlans = Array(teacher.lessons).fill().map(() => splitDuration(teacher.duration));

    // تتبع الغرف المفضلة لكل مستوى تراجع
    let preferredRooms = {};
    if (backtrackLevel > 0 && preferredRooms[backtrackLevel]) {
        // إذا كان هناك غرف مفضلة في هذا المستوى، استخدمها
    } else {
        // وإلا، قم بترتيب الغرف عشوائياً أو حسب معيار آخر
        preferredRooms[backtrackLevel] = shuffle([...rooms]);
    }

    function backtrack(lessonIndex, tempSchedule) {
        if (lessonIndex === lessonPlans.length) {
            const next = findSchedule(rest, days, start, end, [...currentSchedule, ...tempSchedule], backtrackLevel + 1); // زيادة مستوى التراجع
            if (next) return next;
            return null;
        }

        for (let plan of lessonPlans[lessonIndex]) {
            const parts = Array.isArray(plan) ? plan : [plan];
            const allOptions = [];

            for (const day of shuffle([...days])) {
                const available = teacher.availability[day] || [];
                for (const h of available) {
                    const timeSlots = Array.from({ length: parts[0] }, (_, i) => h + i);
                    if (timeSlots[timeSlots.length - 1] >= end) continue;

                    for (const room of preferredRooms[backtrackLevel]) { // استخدام الغرف المفضلة
                        const hasConflict = timeSlots.some(hour =>
                            isConflict(currentSchedule.concat(tempSchedule), day, hour, room, teacher.name)
                        );

                        const entry = {
                            day,
                            hours: timeSlots,
                            room,
                            teacher: teacher.name,
                            subject: teacher.subject
                        };

                        if (!hasConflict && checkHardConstraints(currentSchedule.concat(tempSchedule), entry)) {
                            allOptions.push(entry);
                        }
                    }
                }
            }

            // **تحسين:** ترتيب الخيارات حسب عدد الغرف المتاحة
            allOptions.sort((a, b) => {
                const availableRoomsA = rooms.filter(r => !isConflict(currentSchedule.concat(tempSchedule), a.day, a.hours[0], r, a.teacher)).length;
                const availableRoomsB = rooms.filter(r => !isConflict(currentSchedule.concat(tempSchedule), b.day, b.hours[0], r, b.teacher)).length;
                return availableRoomsB - availableRoomsA; // ترتيب تنازلي (الأكثر غرفاً متاحة أولاً)
            });

            for (const opt of allOptions) {
                const lessonData = opt.hours.map(h => ({
                    day: opt.day,
                    hour: h,
                    teacher: opt.teacher,
                    subject: opt.subject,
                    room: opt.room
                }));

                const result = backtrack(lessonIndex + 1, [...tempSchedule, ...lessonData]);
                if (result) return result;
            }
        }

        return null;
    }

    return backtrack(0, []);
}

function renderSchedule(containerId, schedule, start, end, days) {
    const container = document.getElementById(containerId);
    if (!Array.isArray(schedule)) {
        container.innerHTML = `<p style="color:red;">⚠️ لم يتم توليد الجدول!</p>`;
        return;
    }

    let html = "<table><thead><tr><th>اليوم \\ الساعة</th>";
    for (let h = start; h < end; h++) html += `<th>${h}:00</th>`;
    html += "</tr></thead><tbody>";

    days.forEach(day => {
        html += `<tr><td>${day}</td>`;
        for (let h = start; h < end; h++) {
            const s = schedule.find(e => e.day === day && e.hour === h);
            if (s) {
                html += `<td><b>${s.subject}</b><br>(${s.teacher})<br>[${s.room}]</td>`;
            } else {
                html += "<td>—</td>";
            }
        }
        html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

function downloadPDF(id) {
    const el = document.getElementById(id);
    if (!el.querySelector("table")) {
        alert("لا يوجد جدول للتصدير.");
        return;
    }
    html2pdf().from(el).save();
}

// إضافة قيد مرن افتراضي لتوزيع القاعات
addSoftConstraint((schedule) => {
    let score = 0;
    const roomCounts = {};
    schedule.forEach(s => {
        roomCounts[s.room] = (roomCounts[s.room] || 0) + 1;
    });

    const avg = schedule.length / rooms.length;
    for (const room in roomCounts) {
        score -= Math.pow(roomCounts[room] - avg, 2); // تقليل التباين
    }
    return score;
});