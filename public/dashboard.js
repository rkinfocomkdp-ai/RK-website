document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------
    // APPLICATION STATE
    // ----------------------------------
    const state = {
        currentTab: 'overview',
        leads: [],
        faults: [],
        bsnlFaults: [],
        customers: [],
        stats: null,
        filters: {
            leadsSearch: '',
            leadsStatus: '',
            faultsSearch: '',
            faultsStatus: '',
            faultsCategory: '',
            bsnlFaultsSearch: '',
            bsnlFaultsStatus: '',
            customersSearch: ''
        },
        views: {
            leads: localStorage.getItem('leads_view_preference') || 'grid',
            faults: localStorage.getItem('faults_view_preference') || 'grid'
        }
    };

    // ----------------------------------
    // DOM ELEMENTS SELECTORS
    // ----------------------------------
    const elements = {
        // Portal Auth
        loginOverlay: document.getElementById('loginOverlay'),
        portalLoginForm: document.getElementById('portalLoginForm'),
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        loginErrorMsg: document.getElementById('login-error-msg'),
        loginBox: document.querySelector('.login-box'),

        // Navigation & Layout
        sidebar: document.getElementById('sidebar'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        menuItems: document.querySelectorAll('.menu-item'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        pageTitle: document.getElementById('page-title'),
        pageSubtitle: document.getElementById('page-subtitle'),
        
        // Telemetry Badges
        badgeLeads: document.getElementById('badge-leads-count'),
        badgeFaults: document.getElementById('badge-faults-count'),
        badgeBsnlFaults: document.getElementById('badge-bsnl-faults-count'),
        
        // Overview Stats
        statTotalLeads: document.getElementById('stat-total-leads'),
        statOpenLeads: document.getElementById('stat-open-leads'),
        statResolvedLeads: document.getElementById('stat-resolved-leads'),
        statTotalFaults: document.getElementById('stat-total-faults'),
        statOpenFaults: document.getElementById('stat-open-faults'),
        statResolvedFaults: document.getElementById('stat-resolved-faults'),
        statResolutionRate: document.getElementById('stat-resolution-rate'),
        statProgressBar: document.getElementById('stat-progress-bar'),
        
        // Dynamic Panels
        categoryChartList: document.getElementById('categoryChartList'),
        recentActivitiesList: document.getElementById('recentActivitiesList'),
        
        // Leads elements
        searchLeads: document.getElementById('search-leads'),
        leadsPills: document.querySelectorAll('[data-status-filter]'),
        leadsContainer: document.getElementById('leads-container'),
        leadsGridBtn: document.getElementById('leads-grid-btn'),
        leadsListBtn: document.getElementById('leads-list-btn'),
        
        // Faults elements
        searchFaults: document.getElementById('search-faults'),
        filterFaultCategory: document.getElementById('filter-fault-category'),
        faultsPills: document.querySelectorAll('[data-status-filter-fault]'),
        faultsContainer: document.getElementById('faults-container'),
        faultsGridBtn: document.getElementById('faults-grid-btn'),
        faultsListBtn: document.getElementById('faults-list-btn'),
        
        // BSNL Faults elements
        searchBsnlFaults: document.getElementById('search-bsnl-faults'),
        bsnlFaultsPills: document.querySelectorAll('[data-status-filter-bsnl]'),
        bsnlFaultsContainer: document.getElementById('bsnl-faults-container'),
        
        // Directory elements
        searchCustomers: document.getElementById('search-customers'),
        customerTotalBadge: document.getElementById('customer-total-badge'),
        customersTableBody: document.getElementById('customers-table-body'),
        
        // Modal & Form Elements
        ticketModal: document.getElementById('ticketModal'),
        openModalBtn: document.getElementById('openModalBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        cancelFormBtn: document.getElementById('cancelFormBtn'),
        manualTicketForm: document.getElementById('manualTicketForm'),
        formType: document.getElementById('form-type'),
        ftthGroup: document.getElementById('ftth-group'),
        faultCategoryGroup: document.getElementById('fault-category-group'),
        formFtth: document.getElementById('form-ftth'),
        formCategory: document.getElementById('form-category'),
        
        // Toasts
        toastContainer: document.getElementById('toastContainer')
    };

    // Helper to get auth header
    function getAuthHeaders() {
        const token = sessionStorage.getItem('portal_token') || '';
        return {
            'Authorization': token,
            'Content-Type': 'application/json'
        };
    }

    const BASE_URL = (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) && window.location.port !== '3000'
        ? 'http://localhost:3000'
        : (window.location.protocol === 'file:' ? 'http://localhost:3000' : '');

    // ----------------------------------
    // API CALLS
    // ----------------------------------
    const API = {
        async login(username, password) {
            const res = await fetch(BASE_URL + '/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Authentication failed");
            }
            return await res.json();
        },
        async getStats() {
            const res = await fetch(BASE_URL + '/api/stats', { headers: getAuthHeaders() });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
            return await res.json();
        },
        async getTickets(type, status = '', search = '') {
            const query = new URLSearchParams({ type, status, search });
            const res = await fetch(BASE_URL + `/api/tickets?${query}`, { headers: getAuthHeaders() });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) throw new Error(`Failed to fetch ${type} tickets`);
            return await res.json();
        },
        async getCustomers(search = '') {
            const query = new URLSearchParams({ search });
            const res = await fetch(BASE_URL + `/api/customers?${query}`, { headers: getAuthHeaders() });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) throw new Error("Failed to fetch customer directory");
            return await res.json();
        },
        async resolveTicket(id) {
            const res = await fetch(BASE_URL + `/api/tickets/${id}/resolve`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ resolvedBy: "Operations Web Portal" })
            });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to resolve ticket");
            }
            return await res.json();
        },
        async createTicket(ticketData) {
            const res = await fetch(BASE_URL + '/api/tickets/create', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(ticketData)
            });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to log operations ticket");
            }
            return await res.json();
        },
        async getBsnlTickets(status = '', search = '') {
            const query = new URLSearchParams({ status, search });
            const res = await fetch(BASE_URL + `/api/bsnl-tickets?${query}`, { headers: getAuthHeaders() });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) throw new Error("Failed to fetch BSNL Online tickets");
            return await res.json();
        },
        async resolveBsnlTicket(requestNo) {
            const res = await fetch(BASE_URL + `/api/bsnl-tickets/${requestNo}/resolve`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ resolvedBy: "Operations Web Portal" })
            });
            if (res.status === 401) {
                handleSessionExpiry();
                throw new Error("Session expired");
            }
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to resolve BSNL ticket");
            }
            return await res.json();
        }
    };

    function handleSessionExpiry() {
        sessionStorage.removeItem('portal_token');
        elements.loginOverlay.style.display = 'flex';
        setTimeout(() => elements.loginOverlay.classList.add('active'), 50);
        showToast("Authentication session expired. Please login again.", "error");
    }

    // ----------------------------------
    // PORTAL SECURE LOGIN CONTROLLER
    // ----------------------------------
    async function handleLoginSubmit(e) {
        e.preventDefault();
        
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value.trim();
        
        try {
            elements.loginErrorMsg.style.display = 'none';
            const data = await API.login(username, password);
            
            // Save Token
            sessionStorage.setItem('portal_token', data.token);
            
            showToast("Welcome back! Unlocking operations portal...", "success");
            
            // Unlock Animation
            elements.loginOverlay.classList.remove('active');
            setTimeout(() => {
                elements.loginOverlay.style.display = 'none';
            }, 500);
            
            // Initialize Dashboard load
            await reloadData();
        } catch (err) {
            console.error(err);
            elements.loginErrorMsg.innerText = err.message;
            elements.loginErrorMsg.style.display = 'block';
            
            // Shake Animation
            elements.loginBox.classList.add('shake-anim');
            elements.loginPassword.value = '';
            
            setTimeout(() => {
                elements.loginBox.classList.remove('shake-anim');
            }, 400);
        }
    }

    // ----------------------------------
    // DYNAMIC TEMPLATE RENDERING
    // ----------------------------------
    
    // Toast notifications orchestrator
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-msg">${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Slide out and remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // Format date text gracefully
    function formatDate(rawDate) {
        if (!rawDate) return "N/A";
        const d = new Date(rawDate);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // Update Overview stats UI
    function renderOverviewStats() {
        if (!state.stats) return;
        const s = state.stats;
        
        // Transition counts
        elements.statTotalLeads.innerText = s.totalLeads;
        elements.statOpenLeads.innerText = `${s.openLeads} Open`;
        elements.statResolvedLeads.innerText = `${s.resolvedLeads} Resolved`;
        
        elements.statTotalFaults.innerText = s.totalFaults;
        elements.statOpenFaults.innerText = `${s.openFaults} Open`;
        elements.statResolvedFaults.innerText = `${s.resolvedFaults} Resolved`;
        
        // Calculate resolution rate (including BSNL faults)
        const total = s.totalLeads + s.totalFaults + (s.totalBsnlFaults || 0);
        const resolved = s.resolvedLeads + s.resolvedFaults + (s.resolvedBsnlFaults || 0);
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        
        elements.statResolutionRate.innerText = `${rate}%`;
        elements.statProgressBar.style.width = `${rate}%`;
        
        // Update sidebar red/blue badges
        elements.badgeLeads.innerText = s.openLeads;
        elements.badgeLeads.style.display = s.openLeads > 0 ? 'inline-block' : 'none';
        
        elements.badgeFaults.innerText = s.openFaults;
        elements.badgeFaults.style.display = s.openFaults > 0 ? 'inline-block' : 'none';

        if (elements.badgeBsnlFaults) {
            elements.badgeBsnlFaults.innerText = s.openBsnlFaults || 0;
            elements.badgeBsnlFaults.style.display = (s.openBsnlFaults && s.openBsnlFaults > 0) ? 'inline-block' : 'none';
        }

        // Render Issue categories bar charts
        renderCategoryCharts(s.byCategory, s.totalFaults);
    }

    // Render category visual charts
    function renderCategoryCharts(byCategory, total) {
        elements.categoryChartList.innerHTML = '';
        const categories = [
            { key: 'Bill Issue', label: 'Billing Issues' },
            { key: 'Internet speed is low', label: 'Internet Speed Low' },
            { key: 'ONU/Router is off', label: 'ONU/Router Off' },
            { key: 'LOS Red', label: 'LOS Red Faults' },
            { key: 'PON blinking', label: 'PON Blinking' },
            { key: 'Other issue', label: 'Other Support Queries' }
        ];

        let hasData = false;
        categories.forEach(cat => {
            const count = byCategory[cat.key] || 0;
            if (count > 0) hasData = true;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            
            const row = document.createElement('div');
            row.className = 'category-row';
            row.innerHTML = `
                <div class="category-row-meta">
                    <span class="category-label">${cat.label}</span>
                    <span class="category-count">${count} complaints (${percentage}%)</span>
                </div>
                <div class="category-bar-wrapper">
                    <div class="category-bar" style="width: ${percentage}%"></div>
                </div>
            `;
            elements.categoryChartList.appendChild(row);
        });

        if (!hasData) {
            elements.categoryChartList.innerHTML = `
                <div class="empty-log-state">
                    <span>🟢</span>
                    <p>No active network faults reported. All lines stable!</p>
                </div>
            `;
        }
    }

    // Populate recent activities panel based on loaded leads and faults
    function renderRecentActivities() {
        elements.recentActivitiesList.innerHTML = '';
        
        // Merge and sort all items by date
        const allItems = [
            ...state.leads.map(l => ({ ...l, actType: 'lead' })),
            ...state.faults.map(f => ({ ...f, actType: 'fault' }))
        ];
        
        allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const limitItems = allItems.slice(0, 5);

        if (limitItems.length === 0) {
            elements.recentActivitiesList.innerHTML = `
                <div class="empty-log-state">
                    <span>📭</span>
                    <p>No operations recorded yet.</p>
                </div>
            `;
            return;
        }

        limitItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            
            let icon = '👥';
            let title = '';
            let detail = '';
            
            if (item.actType === 'lead') {
                icon = '👥';
                title = `New Connection Lead #L-${item.lead_id || 'N/A'}: <strong>${item.customer_name}</strong>`;
                detail = `Lead status is currently <strong>${item.status}</strong>. Location: ${item.address || 'N/A'}`;
            } else {
                icon = item.status === 'RESOLVED' ? '✅' : '🚨';
                title = `Fault #F-${item.fault_id || 'N/A'} (${item.issue_type}): <strong>${item.customer_name}</strong>`;
                detail = `Assigned to: ${item.technician_name} (${item.technician_mobile}). Status: <strong>${item.status}</strong>`;
            }
            
            const statusClass = item.status === 'RESOLVED' ? 'resolve' : item.actType;

            div.innerHTML = `
                <div class="activity-badge ${statusClass}">${icon}</div>
                <div class="activity-details">
                    <p>${title}</p>
                    <p>${detail}</p>
                    <span class="activity-time">${formatDate(item.created_at)}</span>
                </div>
            `;
            elements.recentActivitiesList.appendChild(div);
        });
    }

    // Render Connection Leads cards
    function renderLeads() {
        elements.leadsContainer.innerHTML = '';
        
        // Apply Grid vs List view preferences
        if (state.views.leads === 'list') {
            elements.leadsContainer.classList.add('list-view');
        } else {
            elements.leadsContainer.classList.remove('list-view');
        }

        if (state.leads.length === 0) {
            elements.leadsContainer.innerHTML = `
                <div class="glass-card text-center" style="grid-column: 1/-1; padding: 4rem 2rem; color: var(--text-muted);">
                    <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">👥</span>
                    <h3>No connection leads found</h3>
                    <p>Adjust your search query or check back later.</p>
                </div>
            `;
            return;
        }

        state.leads.forEach(lead => {
            const card = document.createElement('div');
            card.className = `metric-card glass-card ticket-card ${lead.status.toLowerCase()}-status`;
            
            const isResolved = lead.status === 'RESOLVED';
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="ticket-meta">
                        <span class="ticket-id">LEAD #${lead.lead_id || 'N/A'}</span>
                        <span class="ticket-date">${formatDate(lead.created_at)}</span>
                    </div>
                    <span class="status-tag ${lead.status.toLowerCase()}">${lead.status}</span>
                </div>
                <div class="customer-name-block">
                    <h4>${lead.customer_name}</h4>
                    <p class="customer-phone">📞 ${lead.mobile_no}</p>
                </div>
                <div class="details-list">
                    <div class="detail-row">
                        <span class="detail-icon">📍</span>
                        <span class="detail-content"><strong>Address:</strong> ${lead.address || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">🛠️</span>
                        <span class="detail-content"><strong>Provision Plan:</strong> BSNL High Speed FTTH</span>
                    </div>
                </div>
                <div class="card-actions">
                    ${!isResolved ? `<button class="btn-resolve" data-resolve-id="${lead.id}">Resolve Connection</button>` : `<span class="emerald-text" style="font-size:0.85rem; font-weight:700; color:var(--success);">✅ PROVISIONED</span>`}
                </div>
            `;
            elements.leadsContainer.appendChild(card);
        });

        // Add action listeners to resolve buttons
        elements.leadsContainer.querySelectorAll('[data-resolve-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-resolve-id');
                await handleTicketResolution(id, 'lead');
            });
        });
    }

    // Render FTTH Fault cards
    function renderFaults() {
        elements.faultsContainer.innerHTML = '';
        
        // Apply Grid vs List view preferences
        if (state.views.faults === 'list') {
            elements.faultsContainer.classList.add('list-view');
        } else {
            elements.faultsContainer.classList.remove('list-view');
        }

        if (state.faults.length === 0) {
            elements.faultsContainer.innerHTML = `
                <div class="glass-card text-center" style="grid-column: 1/-1; padding: 4rem 2rem; color: var(--text-muted);">
                    <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🚨</span>
                    <h3>No network faults recorded</h3>
                    <p>All client lines reporting functional active signals!</p>
                </div>
            `;
            return;
        }

        state.faults.forEach(fault => {
            const card = document.createElement('div');
            card.className = `metric-card glass-card ticket-card ${fault.status.toLowerCase()}-status`;
            
            const isResolved = fault.status === 'RESOLVED';
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="ticket-meta">
                        <span class="ticket-id">FAULT #${fault.fault_id || 'N/A'}</span>
                        <span class="ticket-date">${formatDate(fault.created_at)}</span>
                    </div>
                    <span class="status-tag ${fault.status.toLowerCase()}">${fault.status}</span>
                </div>
                <div class="customer-name-block">
                    <h4>${fault.customer_name}</h4>
                    <p class="customer-phone">📞 Phone: ${fault.mobile_no || 'N/A'}</p>
                </div>
                <div class="details-list">
                    <div class="detail-row">
                        <span class="detail-icon">🌐</span>
                        <span class="detail-content"><strong>FTTH ID:</strong> ${fault.ftth_number}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">⚠️</span>
                        <span class="detail-content"><strong>Issue:</strong> ${fault.issue_type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">📍</span>
                        <span class="detail-content"><strong>Address:</strong> ${fault.address || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">👷</span>
                        <span class="detail-content"><strong>Technician:</strong> ${fault.technician_name} (${fault.technician_mobile})</span>
                    </div>
                </div>
                <div class="card-actions">
                    ${!isResolved ? `<button class="btn-resolve" data-resolve-id="${fault.id}">Mark Resolved</button>` : `<span class="emerald-text" style="font-size:0.85rem; font-weight:700; color:var(--success);">🟢 DISPATCH SOLVED</span>`}
                </div>
            `;
            elements.faultsContainer.appendChild(card);
        });

        // Add action listeners to resolve buttons
        elements.faultsContainer.querySelectorAll('[data-resolve-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-resolve-id');
                await handleTicketResolution(id, 'fault');
            });
        });
    }

    // Render Customer Directory Table rows
    function renderCustomers() {
        elements.customersTableBody.innerHTML = '';
        elements.customerTotalBadge.innerText = state.customers.length;
        
        if (state.customers.length === 0) {
            elements.customersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 4rem; color: var(--text-muted);">
                        <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">📇</span>
                        No customers synced in directory matching filters.
                    </td>
                </tr>
            `;
            return;
        }

        state.customers.forEach(cust => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="tbl-name">${cust.customer_name}</div>
                </td>
                <td>
                    <strong class="ticket-id" style="background: rgba(255,255,255,0.03); color: var(--text-primary); border-color: rgba(255,255,255,0.05);">${cust.ftth_number}</strong>
                </td>
                <td>
                    <span style="font-weight: 500;">${cust.mobile_no || 'N/A'}</span>
                </td>
                <td>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">${cust.customer_email || 'N/A'}</span>
                </td>
                <td>
                    <code style="font-family: monospace; font-size: 0.85rem; color: #29b6f6;">${cust.olt_ip || 'N/A'}</code>
                </td>
                <td>
                    <div class="tbl-address" title="${cust.address}">${cust.address || 'N/A'}</div>
                </td>
                <td>
                    <div class="tbl-tech">
                        <strong>${cust.billing_technician_name || 'Not Assigned'}</strong>
                        <span>${cust.billing_technician_mobile || 'N/A'}</span>
                    </div>
                </td>
                <td>
                    <div class="tbl-tech">
                        <strong>${cust.technical_technician_name || 'Not Assigned'}</strong>
                        <span>${cust.technical_technician_mobile || 'N/A'}</span>
                    </div>
                </td>
            `;
            elements.customersTableBody.appendChild(tr);
        });
    }

    // ----------------------------------
    // APPLICATION ACTIONS CONTROLLER
    // ----------------------------------
    
    // Resolve ticket trigger
    async function handleTicketResolution(id, type) {
        try {
            showToast(`Initiating ticket #${id} resolution...`, 'info');
            const data = await API.resolveTicket(id);
            showToast(`Success! Ticket #${id} resolved. Customer notified.`, 'success');
            
            // Re-fetch all data to synchronize
            await reloadData();
        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
        }
    }

    // Form manual creation handler
    async function handleManualSubmit(e) {
        e.preventDefault();
        
        const customer_name = document.getElementById('form-cust-name').value.trim();
        const mobile_no = document.getElementById('form-mobile').value.trim();
        const ticketType = elements.formType.value;
        
        let ftth_number = 'NEW_CONN';
        let issue_type = 'new_connection';
        
        if (ticketType === 'fault') {
            ftth_number = elements.formFtth.value.trim();
            issue_type = elements.formCategory.value;
            if (!ftth_number) {
                showToast("FTTH Number is required for fault tickets.", "error");
                return;
            }
        }
        
        const address = document.getElementById('form-address').value.trim();
        const issue_description = document.getElementById('form-desc').value.trim();
        
        try {
            showToast("Logging new support record in database...", "info");
            
            await API.createTicket({
                ftth_number,
                customer_name,
                mobile_no,
                address,
                issue_type,
                issue_description
            });
            
            showToast("Manual ticket successfully logged and synced!", "success");
            
            // Reset and close
            elements.manualTicketForm.reset();
            closeModal();
            
            // Reload all
            await reloadData();
        } catch (err) {
            console.error(err);
            showToast(err.message, "error");
        }
    }

    // ----------------------------------
    // REFRESH & DATA LOADERS
    // ----------------------------------
    async function loadStats() {
        try {
            state.stats = await API.getStats();
            renderOverviewStats();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadLeads() {
        try {
            state.leads = await API.getTickets('lead', state.filters.leadsStatus, state.filters.leadsSearch);
            renderLeads();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadFaults() {
        try {
            // Apply category filter and search
            let rawFaults = await API.getTickets('fault', state.filters.faultsStatus, state.filters.faultsSearch);
            if (state.filters.faultsCategory) {
                rawFaults = rawFaults.filter(f => f.issue_type === state.filters.faultsCategory);
            }
            state.faults = rawFaults;
            renderFaults();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadCustomers() {
        try {
            state.customers = await API.getCustomers(state.filters.customersSearch);
            renderCustomers();
        } catch (err) {
            console.error(err);
        }
    }

    async function loadBsnlFaults() {
        try {
            state.bsnlFaults = await API.getBsnlTickets(state.filters.bsnlFaultsStatus, state.filters.bsnlFaultsSearch);
            renderBsnlFaults();
        } catch (err) {
            console.error(err);
        }
    }

    function renderBsnlFaults() {
        if (!elements.bsnlFaultsContainer) return;
        elements.bsnlFaultsContainer.innerHTML = '';

        if (state.bsnlFaults.length === 0) {
            elements.bsnlFaultsContainer.innerHTML = `
                <div class="glass-card text-center" style="grid-column: 1/-1; padding: 4rem 2rem; color: var(--text-muted);">
                    <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🌐</span>
                    <h3>No online faults found</h3>
                    <p>BSNL DSCM Portal has no active matching faults.</p>
                </div>
            `;
            return;
        }

        state.bsnlFaults.forEach(ticket => {
            const card = document.createElement('div');
            card.className = `metric-card glass-card ticket-card ${ticket.status.toLowerCase()}-status`;
            
            const isResolved = ['RESOLVED', 'COMPLETED', 'ARCHIVED'].includes(ticket.status.toUpperCase());
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="ticket-meta">
                        <span class="ticket-id">PORTAL #${ticket.request_no}</span>
                        <span class="ticket-date">${formatDate(ticket.create_date)}</span>
                    </div>
                    <span class="status-tag ${ticket.status.toLowerCase()}">${ticket.status}</span>
                </div>
                <div class="customer-name-block">
                    <h4>${ticket.customer_name}</h4>
                    <p class="customer-phone">📞 Phone: ${ticket.phone || 'N/A'}</p>
                </div>
                <div class="details-list">
                    <div class="detail-row">
                        <span class="detail-icon">🏢</span>
                        <span class="detail-content"><strong>Team:</strong> ${ticket.team_name || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">📍</span>
                        <span class="detail-content"><strong>Address:</strong> ${ticket.address || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">👮</span>
                        <span class="detail-content"><strong>Agent:</strong> ${ticket.handler_name || 'N/A'}</span>
                    </div>
                </div>
                <div class="card-actions">
                    ${!isResolved ? `<button class="btn-resolve" data-resolve-bsnl-id="${ticket.request_no}">Mark Resolved</button>` : `<span class="emerald-text" style="font-size:0.85rem; font-weight:700; color:var(--success);">🟢 RESOLVED</span>`}
                </div>
            `;
            elements.bsnlFaultsContainer.appendChild(card);
        });

        // Add action listeners to resolve buttons
        elements.bsnlFaultsContainer.querySelectorAll('[data-resolve-bsnl-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const requestNo = e.target.getAttribute('data-resolve-bsnl-id');
                await handleBsnlTicketResolution(requestNo);
            });
        });
    }

    async function handleBsnlTicketResolution(requestNo) {
        try {
            showToast(`Initiating BSNL ticket #${requestNo} resolution...`, 'info');
            await API.resolveBsnlTicket(requestNo);
            showToast(`Success! BSNL Ticket #${requestNo} resolved.`, 'success');
            await reloadData();
        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
        }
    }

    async function reloadData() {
        await loadStats();
        await loadLeads();
        await loadFaults();
        await loadBsnlFaults();
        await loadCustomers();
        renderRecentActivities();
    }

    // ----------------------------------
    // NAVIGATION & TAB CONTROLLER
    // ----------------------------------
    function switchTab(tabId) {
        state.currentTab = tabId;
        
        // Remove active from all sidebar items and panes
        elements.menuItems.forEach(item => item.classList.remove('active'));
        elements.tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Set active target
        const activeItem = Array.from(elements.menuItems).find(i => i.getAttribute('data-tab') === tabId);
        if (activeItem) activeItem.classList.add('active');
        
        const activePane = document.getElementById(`${tabId}-tab`);
        if (activePane) activePane.classList.add('active');
        
        // Close mobile menu on switch
        elements.sidebar.classList.remove('active');
        
        // Update header headers
        const titles = {
            overview: { title: "Operations Telemetry", sub: "Real-time status of BSNL FTTH network activities" },
            leads: { title: "Connection Leads CRM", sub: "New subscriber leads submitted via WhatsApp Business Flow" },
            faults: { title: "Offline Support Tickets", sub: "Open complaints and network disruptions reported by clients" },
            directory: { title: "BSNL Customer CRM Directory", sub: "Master record list loaded from Excel Database logs" },
            'bsnl-faults': { title: "BSNL Pending Fault Orders", sub: "Real-time monitor of BSNL WSC pending fault tickets" }
        };
        
        elements.pageTitle.innerText = titles[tabId].title;
        elements.pageSubtitle.innerText = titles[tabId].sub;
    }

    // ----------------------------------
    // INTERACTIVE MODAL & FORM SWITCHER
    // ----------------------------------
    function openModal() {
        elements.ticketModal.classList.add('active');
    }
    
    function closeModal() {
        elements.ticketModal.classList.remove('active');
    }

    // Form selection handler (Lead vs Fault)
    elements.formType.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'fault') {
            elements.ftthGroup.style.display = 'flex';
            elements.formFtth.setAttribute('required', 'true');
            elements.faultCategoryGroup.style.display = 'flex';
        } else {
            elements.ftthGroup.style.display = 'none';
            elements.formFtth.removeAttribute('required');
            elements.faultCategoryGroup.style.display = 'none';
        }
    });

    // ----------------------------------
    // EVENT LISTENERS & SEARCHES
    // ----------------------------------
    
    // Auth Form Submit Listener
    elements.portalLoginForm.addEventListener('submit', handleLoginSubmit);

    // Tab switching
    elements.menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Mobile Hamburger
    elements.menuToggleBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
    });

    // Modal Triggers
    elements.openModalBtn.addEventListener('click', openModal);
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelFormBtn.addEventListener('click', closeModal);
    
    // Form submission
    elements.manualTicketForm.addEventListener('submit', handleManualSubmit);

    // Search Box Inputs
    elements.searchLeads.addEventListener('input', (e) => {
        state.filters.leadsSearch = e.target.value.trim();
        loadLeads();
    });

    elements.searchFaults.addEventListener('input', (e) => {
        state.filters.faultsSearch = e.target.value.trim();
        loadFaults();
    });

    elements.filterFaultCategory.addEventListener('change', (e) => {
        state.filters.faultsCategory = e.target.value;
        loadFaults();
    });

    elements.searchCustomers.addEventListener('input', (e) => {
        state.filters.customersSearch = e.target.value.trim();
        loadCustomers();
    });

    elements.searchBsnlFaults.addEventListener('input', (e) => {
        state.filters.bsnlFaultsSearch = e.target.value.trim();
        loadBsnlFaults();
    });

    // Status Filter Pills (BSNL Faults)
    elements.bsnlFaultsPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            elements.bsnlFaultsPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            state.filters.bsnlFaultsStatus = e.target.getAttribute('data-status-filter-bsnl');
            loadBsnlFaults();
        });
    });

    // Status Filter Pills (Leads)
    elements.leadsPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            elements.leadsPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            state.filters.leadsStatus = e.target.getAttribute('data-status-filter');
            loadLeads();
        });
    });

    // Status Filter Pills (Faults)
    elements.faultsPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            elements.faultsPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            state.filters.faultsStatus = e.target.getAttribute('data-status-filter-fault');
            loadFaults();
        });
    });

    // Grid vs List Layout Buttons (Leads)
    elements.leadsGridBtn.addEventListener('click', () => {
        elements.leadsGridBtn.classList.add('active');
        elements.leadsListBtn.classList.remove('active');
        state.views.leads = 'grid';
        localStorage.setItem('leads_view_preference', 'grid');
        renderLeads();
    });

    elements.leadsListBtn.addEventListener('click', () => {
        elements.leadsGridBtn.classList.remove('active');
        elements.leadsListBtn.classList.add('active');
        state.views.leads = 'list';
        localStorage.setItem('leads_view_preference', 'list');
        renderLeads();
    });

    // Grid vs List Layout Buttons (Faults)
    elements.faultsGridBtn.addEventListener('click', () => {
        elements.faultsGridBtn.classList.add('active');
        elements.faultsListBtn.classList.remove('active');
        state.views.faults = 'grid';
        localStorage.setItem('faults_view_preference', 'grid');
        renderFaults();
    });

    elements.faultsListBtn.addEventListener('click', () => {
        elements.faultsGridBtn.classList.remove('active');
        elements.faultsListBtn.classList.add('active');
        state.views.faults = 'list';
        localStorage.setItem('faults_view_preference', 'list');
        renderFaults();
    });

    // Configure layout toggle buttons active state on load
    if (state.views.leads === 'list') {
        elements.leadsGridBtn.classList.remove('active');
        elements.leadsListBtn.classList.add('active');
    }
    if (state.views.faults === 'list') {
        elements.faultsGridBtn.classList.remove('active');
        elements.faultsListBtn.classList.add('active');
    }

    // ----------------------------------
    // INITIALIZATION RUN
    // ----------------------------------
    const token = sessionStorage.getItem('portal_token');
    if (token) {
        // Authenticated: hide overlay and load telemetry
        elements.loginOverlay.classList.remove('active');
        elements.loginOverlay.style.display = 'none';
        
        showToast("Operations Control Room connecting...", "info");
        reloadData().then(() => {
            showToast("Telemetry synced successfully with BSNL Database.", "success");
        }).catch(err => {
            console.error(err);
            if (err.message !== "Session expired") {
                showToast("Error establishing active server connection.", "error");
            }
        });
    } else {
        // Show Login overlay
        elements.loginOverlay.style.display = 'flex';
        elements.loginOverlay.classList.add('active');
        showToast("Please authenticate to access operations portal.", "info");
    }

    // Periodic live-refresh every 30 seconds (quietly updates in background)
    setInterval(() => {
        if (!sessionStorage.getItem('portal_token')) return; // skip if unauthenticated
        loadStats();
        if (state.currentTab === 'overview') {
            loadLeads();
            loadFaults();
            loadBsnlFaults();
        } else if (state.currentTab === 'leads') {
            loadLeads();
        } else if (state.currentTab === 'faults') {
            loadFaults();
        } else if (state.currentTab === 'bsnl-faults') {
            loadBsnlFaults();
        }
    }, 30000);
});
