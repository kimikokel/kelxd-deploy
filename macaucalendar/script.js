class InteractiveCalendar {
    constructor() {
        this.selectedDays = new Set();
        this.isDragging = false;
        this.dragStartDay = null;
        this.dragCurrentDay = null;
        this.isMouseDown = false;
        this.isLightTheme = false;
        this.monthNames = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];
        this.dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.loadThemeFromLocalStorage();
        this.generateCalendar();
        this.attachEventListeners();
        this.updateSelectedCount();
        this.updateDaysNeeded();
    }

    generateCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';

        for (let month = 0; month < 12; month++) {
            const monthElement = this.createMonth(2025, month);
            calendarGrid.appendChild(monthElement);
        }

        // Apply stored selections after DOM is ready
        setTimeout(() => {
            this.applyStoredSelections();
            this.updateSelectedCount();
            this.updateDaysNeeded();
        }, 0);
    }

    createMonth(year, month) {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month';

        // Month header with controls
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.textContent = this.monthNames[month];
        monthDiv.appendChild(monthHeader);

        // Month controls
        const monthControls = document.createElement('div');
        monthControls.className = 'month-controls';
        
        const selectMonthBtn = document.createElement('button');
        selectMonthBtn.className = 'month-btn select-month';
        selectMonthBtn.textContent = '選擇所有';
        selectMonthBtn.dataset.month = month;
        selectMonthBtn.dataset.year = year;
        
        const deselectMonthBtn = document.createElement('button');
        deselectMonthBtn.className = 'month-btn deselect-month';
        deselectMonthBtn.textContent = '取消選擇所有';
        deselectMonthBtn.dataset.month = month;
        deselectMonthBtn.dataset.year = year;
        
        monthControls.appendChild(selectMonthBtn);
        monthControls.appendChild(deselectMonthBtn);
        monthDiv.appendChild(monthControls);

        // Days header
        const daysHeader = document.createElement('div');
        daysHeader.className = 'days-header';
        this.dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = dayName;
            daysHeader.appendChild(dayHeader);
        });
        monthDiv.appendChild(daysHeader);

        // Days grid
        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day empty';
            daysGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = day;
            dayElement.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Mark weekends
            const dayOfWeek = new Date(year, month, day).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayElement.classList.add('weekend');
            }

            daysGrid.appendChild(dayElement);
        }

        monthDiv.appendChild(daysGrid);
        return monthDiv;
    }

    attachEventListeners() {
        const calendarGrid = document.getElementById('calendarGrid');
        const selectAllBtn = document.getElementById('selectAll');
        const deselectAllBtn = document.getElementById('deselectAll');
        const themeToggleBtn = document.getElementById('themeToggle');

        // Select/Deselect all buttons
        selectAllBtn.addEventListener('click', () => this.selectAllDays());
        deselectAllBtn.addEventListener('click', () => this.deselectAllDays());

        // Theme toggle button
        themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        // Mouse events for day selection and dragging
        calendarGrid.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        calendarGrid.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        calendarGrid.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        calendarGrid.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));

        // Prevent text selection during drag
        calendarGrid.addEventListener('selectstart', (e) => e.preventDefault());

        // Touch events for mobile support
        calendarGrid.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        calendarGrid.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        calendarGrid.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        calendarGrid.addEventListener('touchcancel', (e) => this.handleTouchCancel(e));

        // Month-specific select/deselect buttons
        calendarGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-month')) {
                this.selectMonth(e.target.dataset.year, e.target.dataset.month);
            } else if (e.target.classList.contains('deselect-month')) {
                this.deselectMonth(e.target.dataset.year, e.target.dataset.month);
            }
        });
    }

    handleMouseDown(e) {
        const dayElement = e.target.closest('.day:not(.empty)');
        if (!dayElement) return;

        this.isMouseDown = true;
        this.isDragging = false;
        this.dragStartDay = dayElement;
        
        // Store the intended selection state (opposite of current state)
        this.dragSelectionMode = !dayElement.classList.contains('selected');
        
        // Single click selection
        this.toggleDaySelection(dayElement);
        
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isMouseDown || !this.dragStartDay) return;

        const dayElement = e.target.closest('.day:not(.empty)');
        if (!dayElement) return;

        if (!this.isDragging) {
            this.isDragging = true;
            document.body.classList.add('selecting');
        }

        this.dragCurrentDay = dayElement;
        this.updateDragSelection();
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.finalizeDragSelection();
        }
        
        this.resetDragState();
    }

    handleMouseLeave(e) {
        if (this.isDragging) {
            this.finalizeDragSelection();
        }
        this.resetDragState();
    }

    handleTouchStart(e) {
        const touch = e.touches[0];
        const dayElement = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.day:not(.empty)');
        if (!dayElement) return;

        // Add visual feedback for touch press
        dayElement.classList.add('touch-active');
        
        this.isMouseDown = true;
        this.isDragging = false;
        this.dragStartDay = dayElement;
        this.touchStartTime = Date.now();
        this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
        this.hasMoved = false;
        
        // Store the intended selection state (opposite of current state)
        this.dragSelectionMode = !dayElement.classList.contains('selected');
        
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (!this.isMouseDown || !this.dragStartDay) return;

        const touch = e.touches[0];
        const dayElement = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.day:not(.empty)');
        
        // Calculate movement distance
        const deltaX = Math.abs(touch.clientX - this.touchStartX);
        const deltaY = Math.abs(touch.clientY - this.touchStartY);
        const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If moved more than 10 pixels, consider it a drag
        if (moveDistance > 10) {
            this.hasMoved = true;
        }

        if (!dayElement) return;

        // If moved significantly, start dragging
        if (this.hasMoved && !this.isDragging) {
            this.isDragging = true;
            // Remove touch-active class when starting to drag
            this.dragStartDay.classList.remove('touch-active');
        }

        if (this.isDragging) {
            this.dragCurrentDay = dayElement;
            this.updateDragSelection();
        }
        
        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (this.isDragging) {
            this.finalizeDragSelection();
            // Clear touch-active states immediately for drag
            document.querySelectorAll('.day.touch-active').forEach(day => {
                day.classList.remove('touch-active');
            });
        } else if (this.dragStartDay && !this.hasMoved) {
            // Simple tap without movement - toggle selection
            this.toggleDaySelection(this.dragStartDay);
            
            // Delay clearing touch-active state to ensure visual feedback is seen
            setTimeout(() => {
                document.querySelectorAll('.day.touch-active').forEach(day => {
                    day.classList.remove('touch-active');
                });
            }, 150);
        } else {
            // Clear touch-active states immediately for other cases
            document.querySelectorAll('.day.touch-active').forEach(day => {
                day.classList.remove('touch-active');
            });
        }
        
        this.resetDragState();
        this.touchStartTime = null;
        this.touchStartX = null;
        this.touchStartY = null;
        this.hasMoved = false;
    }

    handleTouchCancel(e) {
        // Clear any touch-active states
        document.querySelectorAll('.day.touch-active').forEach(day => {
            day.classList.remove('touch-active');
        });
        
        this.resetDragState();
    }

    updateDragSelection() {
        if (!this.dragStartDay || !this.dragCurrentDay) return;

        // Clear previous drag highlights
        document.querySelectorAll('.day.dragging').forEach(day => {
            day.classList.remove('dragging');
        });

        // Get all days between start and current
        const daysBetween = this.getDaysBetween(this.dragStartDay, this.dragCurrentDay);
        
        // Highlight days in selection range with preview of intended selection state
        daysBetween.forEach(day => {
            day.classList.add('dragging');
            // Add a class to indicate the intended selection state
            if (this.dragSelectionMode) {
                day.classList.add('drag-selecting');
                day.classList.remove('drag-deselecting');
            } else {
                day.classList.add('drag-deselecting');
                day.classList.remove('drag-selecting');
            }
        });
    }

    finalizeDragSelection() {
        if (!this.dragStartDay || !this.dragCurrentDay) return;

        const daysBetween = this.getDaysBetween(this.dragStartDay, this.dragCurrentDay);
        
        // Use the stored selection mode instead of checking current state
        const shouldSelect = this.dragSelectionMode;
        
        // Apply selection state to all days in range
        daysBetween.forEach(day => {
            if (shouldSelect) {
                this.selectDay(day);
            } else {
                this.deselectDay(day);
            }
            day.classList.remove('dragging');
            day.classList.remove('drag-selecting');
            day.classList.remove('drag-deselecting');
        });

        this.updateSelectedCount();
        this.updateDaysNeeded();
        // Note: saveToLocalStorage is called within selectDay/deselectDay methods
    }

    getDaysBetween(startDay, endDay) {
        const startDate = new Date(startDay.dataset.date);
        const endDate = new Date(endDay.dataset.date);
        
        // Ensure start date is before end date
        const [earlierDate, laterDate] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
        
        const daysBetween = [];
        const currentDate = new Date(earlierDate);
        
        while (currentDate <= laterDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const dayElement = document.querySelector(`[data-date="${dateString}"]`);
            if (dayElement) {
                daysBetween.push(dayElement);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return daysBetween;
    }

    resetDragState() {
        this.isMouseDown = false;
        this.isDragging = false;
        this.dragStartDay = null;
        this.dragCurrentDay = null;
        this.touchStartTime = null;
        this.touchStartX = null;
        this.touchStartY = null;
        this.touchStartPosition = null;
        this.hasMoved = false;
        this.dragSelectionMode = null;
        document.body.classList.remove('selecting');
        
        // Remove drag highlights
        document.querySelectorAll('.day.dragging').forEach(day => {
            day.classList.remove('dragging');
            day.classList.remove('drag-selecting');
            day.classList.remove('drag-deselecting');
        });
        
        // Remove touch-active states
        document.querySelectorAll('.day.touch-active').forEach(day => {
            day.classList.remove('touch-active');
        });
    }

    toggleDaySelection(dayElement) {
        if (dayElement.classList.contains('selected')) {
            this.deselectDay(dayElement);
        } else {
            this.selectDay(dayElement);
        }
        this.updateSelectedCount();
        this.updateDaysNeeded();
    }

    selectDay(dayElement) {
        dayElement.classList.add('selected');
        this.selectedDays.add(dayElement.dataset.date);
        this.saveToLocalStorage();
    }

    deselectDay(dayElement) {
        dayElement.classList.remove('selected');
        this.selectedDays.delete(dayElement.dataset.date);
        this.saveToLocalStorage();
    }

    selectAllDays() {
        const allDays = document.querySelectorAll('.day:not(.empty)');
        allDays.forEach(day => {
            this.selectDay(day);
        });
        this.updateSelectedCount();
        this.updateDaysNeeded();
        this.saveToLocalStorage();
    }

    deselectAllDays() {
        const allDays = document.querySelectorAll('.day.selected');
        allDays.forEach(day => {
            this.deselectDay(day);
        });
        this.selectedDays.clear();
        this.updateSelectedCount();
        this.updateDaysNeeded();
        this.saveToLocalStorage();
    }

    selectMonth(year, month) {
        const monthDays = document.querySelectorAll(`[data-date^="${year}-${String(parseInt(month) + 1).padStart(2, '0')}-"]`);
        monthDays.forEach(day => {
            this.selectDay(day);
        });
        this.updateSelectedCount();
        this.updateDaysNeeded();
        this.saveToLocalStorage();
    }

    deselectMonth(year, month) {
        const monthDays = document.querySelectorAll(`[data-date^="${year}-${String(parseInt(month) + 1).padStart(2, '0')}-"]`);
        monthDays.forEach(day => {
            this.deselectDay(day);
        });
        this.updateSelectedCount();
        this.updateDaysNeeded();
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        try {
            const selectedDatesArray = Array.from(this.selectedDays);
            localStorage.setItem('calendar-selected-days-2025', JSON.stringify(selectedDatesArray));
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const savedDates = localStorage.getItem('calendar-selected-days-2025');
            if (savedDates) {
                const datesArray = JSON.parse(savedDates);
                this.selectedDays = new Set(datesArray);
            }
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
            this.selectedDays = new Set();
        }
    }

    applyStoredSelections() {
        // Apply the stored selections to the DOM after calendar is generated
        this.selectedDays.forEach(date => {
            const dayElement = document.querySelector(`[data-date="${date}"]`);
            if (dayElement) {
                dayElement.classList.add('selected');
            }
        });
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        const count = this.selectedDays.size;
        
        // Add animation class
        countElement.classList.add('updating');
        
        setTimeout(() => {
            countElement.textContent = count;
            countElement.classList.remove('updating');
        }, 150);
    }

    updateDaysNeeded() {
        const daysNeededElement = document.getElementById('daysNeeded');
        const achievementMessage = document.getElementById('achievementMessage');
        const selectedCount = this.selectedDays.size;
        const requiredDays = 183;
        const daysNeeded = Math.max(0, requiredDays - selectedCount);
        
        // Add animation class
        daysNeededElement.classList.add('updating');
        
        setTimeout(() => {
            daysNeededElement.textContent = daysNeeded;
            daysNeededElement.classList.remove('updating');
        }, 150);

        // Show/hide achievement message
        if (selectedCount >= requiredDays) {
            achievementMessage.classList.remove('hidden');
        } else {
            achievementMessage.classList.add('hidden');
        }
    }

    toggleTheme() {
        this.isLightTheme = !this.isLightTheme;
        const body = document.body;
        const themeToggleBtn = document.getElementById('themeToggle');
        
        if (this.isLightTheme) {
            body.classList.add('light-theme');
            themeToggleBtn.textContent = '🌙 深色模式';
        } else {
            body.classList.remove('light-theme');
            themeToggleBtn.textContent = '☀️ 淺色模式';
        }
        
        this.saveThemeToLocalStorage();
    }

    saveThemeToLocalStorage() {
        try {
            localStorage.setItem('calendar-theme-2025', JSON.stringify(this.isLightTheme));
        } catch (error) {
            console.warn('Could not save theme to localStorage:', error);
        }
    }

    loadThemeFromLocalStorage() {
        try {
            const savedTheme = localStorage.getItem('calendar-theme-2025');
            if (savedTheme !== null) {
                this.isLightTheme = JSON.parse(savedTheme);
                const body = document.body;
                const themeToggleBtn = document.getElementById('themeToggle');
                
                if (this.isLightTheme) {
                    body.classList.add('light-theme');
                    if (themeToggleBtn) themeToggleBtn.textContent = '🌙 深色模式';
                } else {
                    body.classList.remove('light-theme');
                    if (themeToggleBtn) themeToggleBtn.textContent = '☀️ 淺色模式';
                }
            }
        } catch (error) {
            console.warn('Could not load theme from localStorage:', error);
            this.isLightTheme = false;
        }
    }

    getSelectedDates() {
        return Array.from(this.selectedDays).sort();
    }

    getSelectedDaysCount() {
        return this.selectedDays.size;
    }
}

// Initialize the calendar when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new InteractiveCalendar();
});

// Expose useful methods to global scope for debugging/external use
window.getSelectedDates = () => window.calendar?.getSelectedDates() || [];
window.getSelectedCount = () => window.calendar?.getSelectedDaysCount() || 0;
