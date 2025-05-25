/**
 * Utility class for managing tags across actors and items
 */
export class TagManager {
    /**
     * Get all available tags from world items, actors and compendiums
     */
    static async getAllTags() {
        const allTags = new Set();
        
        // World items and actors
        const allItems = game.items.contents;
        const allActors = game.actors.contents;
        [...allItems, ...allActors].forEach(doc => {
            const docTags = doc.getFlag("crysborg", "tags");
            if (docTags) {
                docTags.split(",")
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0)
                    .forEach(tag => allTags.add(tag));
            }
        });

        // Compendium items and actors
        for (const pack of game.packs.filter(p => p.documentName === "Item" || p.documentName === "Actor")) {
            let index = await pack.getIndex({fields: ["flags.crysborg.tags"]});
            for (const entry of index) {
                const docTags = entry.flags?.crysborg?.tags;
                if (docTags) {
                    docTags.split(",")
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0)
                        .forEach(tag => allTags.add(tag));
                }
            }
        }

        return Array.from(allTags).sort();
    }

    /**
     * Initialize tag dropdown functionality for an input
     */
    static initializeTagInput(html, inputSelector, availableTags) {
        const tagInput = html.find(inputSelector);
        const tagWrapper = tagInput.parent();
        
        if (!tagWrapper.find('.tag-dropdown').length) {
            tagWrapper.append('<div class="tag-dropdown"></div>');
        }
        const tagDropdown = tagWrapper.find('.tag-dropdown');

        // Helper to update dropdown
        const updateDropdown = (forceShowAll = false) => {
            const value = tagInput.val();
            const tags = value.split(',').map(t => t.trim()).filter(Boolean);
            let filtered;
            if (forceShowAll) {
                filtered = availableTags.filter(tag => !tags.includes(tag));
            } else {
                const last = value.lastIndexOf(',');
                const current = last >= 0 ? value.slice(last + 1).trim() : value.trim();
                filtered = availableTags.filter(tag =>
                    tag.toLowerCase().includes(current.toLowerCase()) && !tags.includes(tag)
                );
            }
            if (filtered.length > 0 && tagInput.is(':focus')) {
                tagDropdown.html(filtered.map(tag => `<div class="tag-option" data-tag="${tag}">${tag}</div>`).join(''));
                tagDropdown.show();
            } else {
                tagDropdown.hide();
            }
        };

        // Always show all tags on focus
        tagInput.on('focus', () => updateDropdown(true));
        // Filter tags on input
        tagInput.on('input', () => updateDropdown(false));

        // Add tag on click
        tagDropdown.on('mousedown', '.tag-option', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const selected = $(this).data('tag');
            let value = tagInput.val();
            const last = value.lastIndexOf(',');
            if (last >= 0) {
                value = value.slice(0, last + 1) + ' ' + selected;
            } else {
                value = selected;
            }
            // Add trailing comma if not last
            value = value.replace(/(,\s*)?$/, ', ');
            tagInput.val(value);
            tagInput.focus();
            updateDropdown(true);
        });

        // Hide dropdown only on blur and no dropdown interaction
        tagInput.on('blur', () => {
            // Give time for potential dropdown click to register
            setTimeout(() => {
                if (!tagDropdown.is(':hover')) {
                    tagDropdown.hide();
                }
            }, 150);
        });

        // Hide dropdown on outside click
        $(document).on('mousedown.crysborgTagDropdown', (e) => {
            if (!$(e.target).closest('.tag-input-wrapper').length) {
                tagDropdown.hide();
            }
        });
    }
}