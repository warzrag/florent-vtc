// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBJuFLVMI3gUKFohxYRZeg8Qyn0mXf1sQI",
  authDomain: "admin-vtc.firebaseapp.com",
  databaseURL: "https://admin-vtc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "admin-vtc",
  storageBucket: "admin-vtc.firebasestorage.app",
  messagingSenderId: "692871193828",
  appId: "1:692871193828:web:2dd34c34736f2faf9bb8f1",
  measurementId: "G-7HMTJSJ13H"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// DOM Elements
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const authMessage = document.getElementById('authMessage');

// Form Elements
const addReservationForm = document.getElementById('addReservationForm');
const editForm = document.getElementById('editForm');
const editModal = document.getElementById('editModal');
const closeModalBtn = document.querySelector('.close');
const deleteBtn = document.getElementById('deleteBtn');

// Table
const reservationsTable = document.getElementById('reservationsBody');

// Filters
const filterAeroport = document.getElementById('filterAeroport');
const filterStatut = document.getElementById('filterStatut');
const filterDate = document.getElementById('filterDate');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Stats
const totalReservations = document.getElementById('totalReservations');
const pendingReservations = document.getElementById('pendingReservations');
const confirmedReservations = document.getElementById('confirmedReservations');
const completedReservations = document.getElementById('completedReservations');

// State
let currentUser = null;
let reservations = [];
let filteredReservations = [];
let currentEditId = null;

// ========== AUTH FUNCTIONS ==========

// Check auth state
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userEmail.textContent = user.email;
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadReservations();
  } else {
    currentUser = null;
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    authMessage.textContent = '';
  }
});

// Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      loginForm.reset();
      authMessage.textContent = '';
    })
    .catch((error) => {
      authMessage.textContent = 'Erreur: ' + error.message;
    });
});

// Logout
logoutBtn.addEventListener('click', () => {
  auth.signOut().catch((error) => console.error('Logout error:', error));
});

// ========== RESERVATIONS FUNCTIONS ==========

// Load all reservations
function loadReservations() {
  db.ref('reservations').on('value', (snapshot) => {
    reservations = [];
    const data = snapshot.val();

    if (data) {
      Object.keys(data).forEach((key) => {
        reservations.push({
          id: key,
          ...data[key]
        });
      });
    }

    // Sort by date descending
    reservations.sort((a, b) => new Date(b.dateReservation) - new Date(a.dateReservation));

    applyFilters();
    updateStats();
  });
}

// Add reservation
addReservationForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newReservation = {
    nomClient: document.getElementById('nomClient').value,
    emailClient: document.getElementById('emailClient').value,
    phoneClient: document.getElementById('phoneClient').value,
    dateReservation: document.getElementById('dateReservation').value,
    heureReservation: document.getElementById('heureReservation').value,
    aeroport: document.getElementById('aeroport').value,
    typeVehicule: document.getElementById('typeVehicule').value,
    nombrePassagers: document.getElementById('nombrePassagers').value,
    statut: document.getElementById('statut').value,
    dateCreation: new Date().toISOString()
  };

  db.ref('reservations').push(newReservation)
    .then(() => {
      addReservationForm.reset();
      showNotification('Réservation ajoutée avec succès!', 'success');
    })
    .catch((error) => {
      showNotification('Erreur: ' + error.message, 'error');
    });
});

// Update reservation
editForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const updatedReservation = {
    nomClient: document.getElementById('editNomClient').value,
    emailClient: document.getElementById('editEmailClient').value,
    phoneClient: document.getElementById('editPhoneClient').value,
    dateReservation: document.getElementById('editDateReservation').value,
    heureReservation: document.getElementById('editHeureReservation').value,
    aeroport: document.getElementById('editAeroport').value,
    typeVehicule: document.getElementById('editTypeVehicule').value,
    nombrePassagers: document.getElementById('editNombrePassagers').value,
    statut: document.getElementById('editStatut').value,
    dateCreation: reservations.find(r => r.id === currentEditId).dateCreation
  };

  db.ref('reservations/' + currentEditId).set(updatedReservation)
    .then(() => {
      editModal.classList.add('hidden');
      showNotification('Réservation mise à jour!', 'success');
    })
    .catch((error) => {
      showNotification('Erreur: ' + error.message, 'error');
    });
});

// Delete reservation
deleteBtn.addEventListener('click', () => {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette réservation?')) {
    db.ref('reservations/' + currentEditId).remove()
      .then(() => {
        editModal.classList.add('hidden');
        showNotification('Réservation supprimée!', 'success');
      })
      .catch((error) => {
        showNotification('Erreur: ' + error.message, 'error');
      });
  }
});

// ========== FILTER FUNCTIONS ==========

// Apply filters
function applyFilters() {
  filteredReservations = reservations.filter((res) => {
    const aeroport = filterAeroport.value ? res.aeroport === filterAeroport.value : true;
    const statut = filterStatut.value ? res.statut === filterStatut.value : true;
    const date = filterDate.value ? res.dateReservation === filterDate.value : true;

    return aeroport && statut && date;
  });

  renderTable();
}

// Add filter listeners
filterAeroport.addEventListener('change', applyFilters);
filterStatut.addEventListener('change', applyFilters);
filterDate.addEventListener('change', applyFilters);

// Reset filters
resetFiltersBtn.addEventListener('click', () => {
  filterAeroport.value = '';
  filterStatut.value = '';
  filterDate.value = '';
  applyFilters();
});

// ========== TABLE RENDERING ==========

function renderTable() {
  reservationsTable.innerHTML = '';

  if (filteredReservations.length === 0) {
    reservationsTable.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem;">Aucune réservation trouvée</td></tr>';
    return;
  }

  filteredReservations.forEach((res) => {
    const row = document.createElement('tr');
    const statusClass = `status-${res.statut.toLowerCase().replace(' ', '-')}`;

    row.innerHTML = `
      <td>${res.nomClient}</td>
      <td>${res.emailClient}</td>
      <td>${res.phoneClient}</td>
      <td>${formatDate(res.dateReservation)}</td>
      <td>${res.heureReservation}</td>
      <td>${res.aeroport}</td>
      <td>${res.typeVehicule}</td>
      <td>${res.nombrePassagers}</td>
      <td><span class="status-badge ${statusClass}">${res.statut}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-edit" onclick="openEditModal('${res.id}')">Modifier</button>
          <button class="btn btn-delete" onclick="deleteReservation('${res.id}')">Supprimer</button>
        </div>
      </td>
    `;

    reservationsTable.appendChild(row);
  });
}

// ========== MODAL FUNCTIONS ==========

function openEditModal(id) {
  currentEditId = id;
  const res = reservations.find(r => r.id === id);

  if (res) {
    document.getElementById('editId').value = id;
    document.getElementById('editNomClient').value = res.nomClient;
    document.getElementById('editEmailClient').value = res.emailClient;
    document.getElementById('editPhoneClient').value = res.phoneClient;
    document.getElementById('editDateReservation').value = res.dateReservation;
    document.getElementById('editHeureReservation').value = res.heureReservation;
    document.getElementById('editAeroport').value = res.aeroport;
    document.getElementById('editTypeVehicule').value = res.typeVehicule;
    document.getElementById('editNombrePassagers').value = res.nombrePassagers;
    document.getElementById('editStatut').value = res.statut;

    editModal.classList.remove('hidden');
  }
}

function deleteReservation(id) {
  currentEditId = id;
  deleteBtn.click();
}

// Close modal
closeModalBtn.addEventListener('click', () => {
  editModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.classList.add('hidden');
  }
});

// ========== STATS FUNCTIONS ==========

function updateStats() {
  const total = reservations.length;
  const pending = reservations.filter(r => r.statut === 'En attente').length;
  const confirmed = reservations.filter(r => r.statut === 'Confirmée').length;
  const completed = reservations.filter(r => r.statut === 'Complétée').length;

  totalReservations.textContent = total;
  pendingReservations.textContent = pending;
  confirmedReservations.textContent = confirmed;
  completedReservations.textContent = completed;
}

// ========== UTILITY FUNCTIONS ==========

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background-color: ${type === 'success' ? '#27ae60' : '#e74c3c'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
