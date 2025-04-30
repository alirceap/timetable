let teachersData = [];
let rooms = [];

const allHours = Array.from({ length: 12 }, (_, i) => i + 8);
const arabicDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء"];

function generateAvailabilityGrid() {
  const grid = document.getElementById('availabilityGrid');
  let html = "<table><thead><tr><th>اليوم/الساعة</th>";
  allHours.forEach(h => html += `<th>${h}:00</th>`);
  html += "</tr></thead><tbody>";

  arabicDays.forEach(day => {
    html += `<tr><td>${day}</td>`;
    allHours.forEach(h => {
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
  const type = document.getElementById('weekType').value;

  if (!name || !subject || isNaN(lessons) || isNaN(duration)) {
    alert("أدخل كل البيانات.");
    return;
  }

  const availability = {};
  document.querySelectorAll('#availabilityGrid input:checked').forEach(input => {
    const day = input.dataset.day;
    const hour = parseInt(input.dataset.hour);
    if (!availability[day]) availability[day] = [];
    availability[day].push(hour);
  });

  teachersData.push({ name, subject, lessons, duration, type, availability });
  renderTeachersTable();
}

function renderTeachersTable() {
  const tbody = document.querySelector("#teachersTable tbody");
  tbody.innerHTML = "";
  teachersData.forEach((t, i) => {
    tbody.innerHTML += `<tr>
      <td>${t.name}</td><td>${t.subject}</td><td>${t.lessons}</td>
      <td>${t.duration}</td><td>${t.type}</td>
      <td><button onclick="removeTeacher(${i})">❌</button></td>
    </tr>`;
  });
}

function removeTeacher(index) {
  teachersData.splice(index, 1);
  renderTeachersTable();
}

function generate() {
  const days = document.getElementById('daysInput').value.split(',').map(d => d.trim());
  const start = parseInt(document.getElementById('startHour').value);
  const end = parseInt(document.getElementById('endHour').value);

  const evenTeachers = teachersData.filter(t => t.type !== 'فردي فقط');
  const oddTeachers = teachersData.filter(t => t.type !== 'زوجي فقط');

  const evenSchedule = scheduleLessons(evenTeachers, days, start, end);
  const oddSchedule = scheduleLessons(oddTeachers, days, start, end);

  renderSchedule('evenSchedule', evenSchedule, start, end, days);
  renderSchedule('oddSchedule', oddSchedule, start, end, days);
}

function scheduleLessons(teachers, days, start, end) {
  const schedule = [];
  const dayLoad = {};
  days.forEach(d => (dayLoad[d] = 0));

  // توزيع المدرسين الأكثر ازدحامًا أولًا
  teachers.sort((a, b) => b.lessons - a.lessons);

  teachers.forEach(teacher => {
    const distributed = {};
    let placedCount = 0;

    const sortedDays = [...days].sort((a, b) => dayLoad[a] - dayLoad[b]);

    for (let i = 0; i < teacher.lessons; i++) {
      let placed = false;

      for (const day of sortedDays) {
        if (distributed[day]) continue;
        const available = teacher.availability[day]?.sort((a, b) => a - b);
        if (!available) continue;

        for (let low = 0, high = available.length - 1; low <= high;) {
          const mid = Math.floor((low + high) / 2);
          const h = available[mid];

          if (h + teacher.duration > end) {
            high = mid - 1;
            continue;
          }

          const timeSlots = Array.from({ length: teacher.duration }, (_, d) => h + d);

          const room = rooms.find(r =>
            !schedule.some(s =>
              s.day === day && timeSlots.includes(s.hour) &&
              (s.room === r || s.teacher === teacher.name)
            )
          );

          if (room) {
            timeSlots.forEach(hour => {
              schedule.push({ day, hour, teacher: teacher.name, subject: teacher.subject, room });
            });
            distributed[day] = true;
            dayLoad[day] += 1;
            placedCount++;
            placed = true;
            break;
          } else {
            low = mid + 1;
          }
        }

        if (placed) break;
      }
    }
  });

  return schedule;
}

function renderSchedule(containerId, schedule, start, end, days) {
  const container = document.getElementById(containerId);
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
