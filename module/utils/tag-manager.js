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
        if (!tagInput.length) return;

        const tagWrapper = tagInput.parent();
        
        // Clean up any existing dropdown and event handlers
        tagWrapper.find('.tag-dropdown').remove();
        tagInput.off('.crysborgTags');
        $(document).off('.crysborgTagDropdown');
        
        // Create new dropdown
        tagWrapper.append('<div class="tag-dropdown"></div>');
        const tagDropdown = tagWrapper.find('.tag-dropdown');

        // Track dropdown interaction state
        let isInteractingWithDropdown = false;

        // Helper to update dropdown
        const updateDropdown = async (forceShowAll = false) => {
            // Refresh available tags
            const currentTags = await TagManager.getAllTags();
            
            const value = tagInput.val();
            const tags = value.split(',').map(t => t.trim()).filter(Boolean);
            let filtered;
            if (forceShowAll) {
                filtered = currentTags.filter(tag => !tags.includes(tag));
            } else {
                const last = value.lastIndexOf(',');
                const current = last >= 0 ? value.slice(last + 1).trim() : value.trim();
                filtered = currentTags.filter(tag =>
                    tag.toLowerCase().includes(current.toLowerCase()) && !tags.includes(tag)
                );
            }
            if (filtered.length > 0 && (tagInput.is(':focus') || isInteractingWithDropdown)) {
                tagDropdown.html(filtered.map(tag => `<div class="tag-option" data-tag="${tag}">${tag}</div>`).join(''));
                tagDropdown.show();
            } else {
                tagDropdown.hide();
            }
        };

        // Show all tags on focus
        tagInput.on('focus.crysborgTags', () => updateDropdown(true));
        
        // Filter tags on input
        tagInput.on('input.crysborgTags', () => updateDropdown(false));

        // Handle dropdown option selection
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

        // Track dropdown interaction state
        tagDropdown
            .on('mouseenter', () => { isInteractingWithDropdown = true; })
            .on('mouseleave', () => { isInteractingWithDropdown = false; });

        // Handle input blur
        tagInput.on('blur.crysborgTags', () => {
            setTimeout(() => {
                if (!isInteractingWithDropdown) {
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