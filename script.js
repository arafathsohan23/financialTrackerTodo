document.addEventListener('DOMContentLoaded', () => {
    const notesContainer = document.getElementById('notes-container');
    const addNoteBtn = document.getElementById('add-note-btn');
    const globalTotalSpan = document.getElementById('global-total-amount');
    const noteTemplate = document.getElementById('note-template');
    const noteItemTemplate = document.getElementById('note-item-template');

    // --- Data Management ---
    let notes = JSON.parse(localStorage.getItem('financeNotes')) || [];

    const saveNotes = () => {
        localStorage.setItem('financeNotes', JSON.stringify(notes));
        calculateGlobalTotal(); // Recalculate global total whenever notes data changes
    };

    // --- Utility Functions ---
    const formatCurrency = (amount) => {
        return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getNoteById = (noteId) => notes.find(note => note.id === noteId);
    const getNoteIndexById = (noteId) => notes.findIndex(note => note.id === noteId);
    const getItemById = (note, itemId) => note.items.find(item => item.id === itemId);
    const getItemIndexById = (note, itemId) => note.items.findIndex(item => item.id === itemId);

    // --- Calculation Functions ---
    const calculateNoteTotal = (noteItems) => {
        // Total is calculated based on amount, regardless of checked state
        return noteItems.reduce((sum, item) => sum + item.amount, 0);
    };

    const calculateGlobalTotal = () => {
        const total = notes.reduce((sum, note) => sum + calculateNoteTotal(note.items), 0);
        globalTotalSpan.textContent = formatCurrency(total);
        applyAmountClass(globalTotalSpan, total);
    };

    const applyAmountClass = (element, amount) => {
        element.classList.remove('income', 'expense', 'zero');
        if (amount > 0) {
            element.classList.add('income');
        } else if (amount < 0) {
            element.classList.add('expense');
        } else {
            element.classList.add('zero');
        }
    };

    // --- Rendering Functions ---

    const renderNoteItem = (noteItem, noteId) => {
        const itemTemplateClone = noteItemTemplate.content.cloneNode(true);
        const li = itemTemplateClone.querySelector('.note-item');
        const checkbox = li.querySelector('.item-checkbox'); // Get checkbox
        const descriptionSpan = li.querySelector('.item-description');
        const amountSpan = li.querySelector('.item-amount');
        const deleteBtn = li.querySelector('.delete-item-btn');

        li.dataset.itemId = noteItem.id;
        descriptionSpan.textContent = noteItem.description;
        amountSpan.textContent = formatCurrency(noteItem.amount);
        applyAmountClass(amountSpan, noteItem.amount);
        if (noteItem.amount > 0) {
             amountSpan.textContent = '+' + amountSpan.textContent;
        }

        // Handle Checkbox state and event listener
        checkbox.checked = noteItem.checked; // Set initial checked state
        if (noteItem.checked) {
            li.classList.add('checked'); // Apply initial style if checked
        }
        checkbox.addEventListener('change', () => handleToggleItemChecked(noteId, noteItem.id));

        // Handle Delete button
        deleteBtn.addEventListener('click', () => handleDeleteItem(noteId, noteItem.id));

        return li;
    };

    const renderNoteCard = (note) => {
        const noteElementTemplateClone = noteTemplate.content.cloneNode(true);
        const noteCard = noteElementTemplateClone.querySelector('.note-card');
        const titleInput = noteCard.querySelector('.note-title-input');
        const itemsList = noteCard.querySelector('.note-items-list');
        const addItemForm = noteCard.querySelector('.add-note-item-form');
        const noteTotalSpan = noteCard.querySelector('.note-total-amount');
        const deleteNoteBtn = noteCard.querySelector('.delete-note-btn');

        noteCard.dataset.noteId = note.id;
        titleInput.value = note.title;

        // Render items using the updated renderNoteItem
        itemsList.innerHTML = '';
        note.items.forEach(item => {
            const itemElement = renderNoteItem(item, note.id);
            itemsList.appendChild(itemElement);
        });

        // Calculate and display note total (unaffected by checked status)
        const noteTotal = calculateNoteTotal(note.items);
        noteTotalSpan.textContent = formatCurrency(noteTotal);
        applyAmountClass(noteTotalSpan, noteTotal);

        // Event listeners for title, add item form, delete note
        titleInput.addEventListener('blur', () => handleTitleChange(note.id, titleInput.value));
        titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { titleInput.blur(); }
        });
        addItemForm.addEventListener('submit', (e) => handleAddItem(e, note.id));
        deleteNoteBtn.addEventListener('click', () => handleDeleteNote(note.id));

        return noteCard;
    };

    const renderAllNotes = () => {
        notesContainer.innerHTML = ''; // Clear container
        notes.forEach(note => {
            const noteCardElement = renderNoteCard(note);
            notesContainer.appendChild(noteCardElement);
        });
        calculateGlobalTotal(); // Update global total after rendering all
    };

    // --- Event Handlers ---

    const handleAddNote = () => {
        const newNote = {
            id: Date.now(),
            title: "", // Start with empty title
            items: []
        };
        notes.unshift(newNote); // Add to the beginning like Keep

        // Render only the new note for efficiency and animation
        const newNoteCard = renderNoteCard(newNote);
        newNoteCard.classList.add('adding'); // Add animation class
        notesContainer.insertBefore(newNoteCard, notesContainer.firstChild);

        // Focus the title input of the new note
        newNoteCard.querySelector('.note-title-input').focus();

        // Remove animation class after completion
        newNoteCard.addEventListener('animationend', () => {
             newNoteCard.classList.remove('adding');
        }, { once: true });

        saveNotes(); // Save and update global total
    };

    const handleTitleChange = (noteId, newTitle) => {
        const note = getNoteById(noteId);
        if (note && note.title !== newTitle) {
            note.title = newTitle.trim();
            saveNotes();
            // No visual re-render needed unless title display is complex
        }
    };

    const handleAddItem = (event, noteId) => {
        event.preventDefault();
        const form = event.target;
        const descriptionInput = form.querySelector('.item-description-input');
        const amountInput = form.querySelector('.item-amount-input');
        const description = descriptionInput.value.trim();
        const amountString = amountInput.value.trim();
        const amount = parseFloat(amountString);

        if (!description || isNaN(amount)) {
            alert("Please enter a valid description and amount.");
            return;
        }

        const newItem = {
            id: Date.now(),
            description: description,
            amount: amount,
            checked: false // Initialize as unchecked
        };

        const note = getNoteById(noteId);
        if (note) {
            note.items.push(newItem);

            // Render the new item visually and update total
            const noteCard = notesContainer.querySelector(`.note-card[data-note-id='${noteId}']`);
            if (noteCard) {
                const itemsList = noteCard.querySelector('.note-items-list');
                const noteTotalSpan = noteCard.querySelector('.note-total-amount');

                const newItemElement = renderNoteItem(newItem, noteId);
                itemsList.appendChild(newItemElement); // Add to end of list

                // Update note total display (checking doesn't affect total)
                const noteTotal = calculateNoteTotal(note.items);
                noteTotalSpan.textContent = formatCurrency(noteTotal);
                applyAmountClass(noteTotalSpan, noteTotal);
            }

            saveNotes(); // Save notes AFTER potentially updating UI elements

            // Clear form
            descriptionInput.value = '';
            amountInput.value = '';
            descriptionInput.focus(); // Focus description for next item
        }
    };

     const handleDeleteItem = (noteId, itemId) => {
        const note = getNoteById(noteId);
        const itemIndex = getItemIndexById(note, itemId);

        if (note && itemIndex > -1) {
            note.items.splice(itemIndex, 1); // Remove item from data

            // Remove item element from DOM and update total for that note
             const noteCard = notesContainer.querySelector(`.note-card[data-note-id='${noteId}']`);
             if (noteCard) {
                const itemElement = noteCard.querySelector(`.note-item[data-item-id='${itemId}']`);
                if (itemElement) {
                    itemElement.remove();
                }

                // Update note total display
                const noteTotalSpan = noteCard.querySelector('.note-total-amount');
                const noteTotal = calculateNoteTotal(note.items);
                noteTotalSpan.textContent = formatCurrency(noteTotal);
                applyAmountClass(noteTotalSpan, noteTotal);
            }
             saveNotes(); // Save after UI updates
        }
    };

    const handleToggleItemChecked = (noteId, itemId) => {
        const note = getNoteById(noteId);
        const item = getItemById(note, itemId);

        if (note && item) {
            item.checked = !item.checked; // Toggle the checked state in the data

            // Update the visual style of the item in the DOM
            const noteCard = notesContainer.querySelector(`.note-card[data-note-id='${noteId}']`);
            const itemElement = noteCard?.querySelector(`.note-item[data-item-id='${itemId}']`);
            if (itemElement) {
                itemElement.classList.toggle('checked', item.checked);
            }

            saveNotes(); // Save the change (doesn't affect totals)
        }
    };

    const handleDeleteNote = (noteId) => {
        const noteIndex = getNoteIndexById(noteId);
        if (noteIndex > -1) {
            const noteCard = notesContainer.querySelector(`.note-card[data-note-id='${noteId}']`);

            if (noteCard) {
                 noteCard.classList.add('deleting'); // Add animation class
                 noteCard.addEventListener('animationend', () => {
                    notes.splice(noteIndex, 1); // Remove from data *after* animation starts
                    saveNotes(); // Save and update global total
                    noteCard.remove(); // Remove from DOM
                 }, { once: true });

                 // Fallback removal in case animationend doesn't fire reliably
                 setTimeout(() => {
                    const currentIndex = getNoteIndexById(noteId); // Check if still exists
                    if (currentIndex > -1 && noteCard.parentNode) { // Ensure it wasn't removed by event listener
                        notes.splice(currentIndex, 1);
                        saveNotes();
                        noteCard.remove();
                    } else if (currentIndex > -1 && !noteCard.parentNode){
                        // Already removed, ensure data is consistent
                        saveNotes();
                    }
                 }, 400); // Slightly longer than animation duration (300ms)
            } else {
                // Fallback if card somehow not found but data exists
                notes.splice(noteIndex, 1);
                saveNotes();
            }
        }
    };

     // --- Initial Setup ---
     addNoteBtn.addEventListener('click', handleAddNote);
     renderAllNotes(); // Render notes on load


     // --- PWA Service Worker Registration ---
     if ('serviceWorker' in navigator) {
         window.addEventListener('load', () => { // Register after page loaded
             navigator.serviceWorker.register('/financial-todo/sw.js')
                 .then(registration => {
                     console.log('ServiceWorker registration successful with scope: ', registration.scope);
                 })
                 .catch(error => {
                     console.log('ServiceWorker registration failed: ', error);
                 });
         });
     }
 
});