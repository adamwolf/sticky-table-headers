import { Plugin } from 'obsidian';

interface ScrollHandler {
    element: HTMLElement;
    handler: (event: Event) => void;
}

export default class StickyTableHeadersPlugin extends Plugin {
    private observers: IntersectionObserver[] = [];
    private scrollHandlers: ScrollHandler[] = [];

    async onload() {
        // For edit view
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                try {
                    const editView = document.querySelector('.markdown-source-view') as HTMLElement | null;
                    if (!editView) {
                        // console.debug('Sticky Table Headers: No edit view found');
                        return;
                    }

                    const tables = editView.querySelectorAll('table');
                    if (!tables.length) {
                        // console.debug('Sticky Table Headers: No tables found in edit view');
                        return;
                    }

                    tables.forEach((table) => {
                        try {
                            const thead = table.querySelector('thead');
                            if (!thead) {
                                console.debug('Sticky Table Headers: Table missing thead', table);
                                return;
                            }

                            const scroller = editView.querySelector('.cm-scroller') as HTMLElement | null;
                            if (!scroller) {
                                console.debug('Sticky Table Headers: No scroller found in edit view');
                                return;
                            }

                            const scrollHandler = () => {
                                try {
                                    const headerRect = thead.getBoundingClientRect();
                                    const scrollerRect = scroller.getBoundingClientRect();

                                    if (headerRect.top < scrollerRect.top) {
                                        (table as HTMLElement).classList.add('header-floating');
                                        this.triggerHeaderStateChange(table as HTMLElement, true);
                                    } else {
                                        (table as HTMLElement).classList.remove('header-floating');
                                        this.triggerHeaderStateChange(table as HTMLElement, false);
                                    }
                                } catch (error) {
                                    console.error('Sticky Table Headers: Error in scroll handler', error);
                                }
                            };

                            // Store handler reference for cleanup
                            this.scrollHandlers.push({
                                element: scroller,
                                handler: scrollHandler
                            });

                            scroller.addEventListener('scroll', scrollHandler, { passive: true });

                            // Initial check
                            const headerRect = thead.getBoundingClientRect();
                            const scrollerRect = scroller.getBoundingClientRect();
                            if (headerRect.top < scrollerRect.top) {
                                (table as HTMLElement).classList.add('header-floating');
                                this.triggerHeaderStateChange(table as HTMLElement, true);
                            }
                        } catch (error) {
                            console.error('Sticky Table Headers: Error processing table in edit view', error);
                        }
                    });
                } catch (error) {
                    console.error('Sticky Table Headers: Error in layout-change handler', error);
                }
            })
        );

        // Post processor for reading view
        this.registerMarkdownPostProcessor(async (element) => {
            try {
                // Wait a bit for layout to settle
                await new Promise(resolve => setTimeout(resolve, 100));

                const previewView = element.closest('.markdown-preview-view') as HTMLElement | null;
                if (!previewView) {
                    // console.debug('Sticky Table Headers: No preview view found');
                    return;
                }

                const tables = element.querySelectorAll('table');
                if (!tables.length) {
                    // console.debug('Sticky Table Headers: No tables found in preview');
                    return;
                }

                tables.forEach((table) => {
                    try {
                        const thead = table.querySelector('thead');
                        if (!thead) {
                            console.debug('Sticky Table Headers: Table missing thead', table);
                            return;
                        }

                        const scrollHandler = () => {
                            try {
                                const headerRect = thead.getBoundingClientRect();
                                const previewRect = previewView.getBoundingClientRect();

                                if (headerRect.top < previewRect.top) {
                                    (table as HTMLElement).classList.add('header-floating');
                                    this.triggerHeaderStateChange(table as HTMLElement, true);
                                } else {
                                    (table as HTMLElement).classList.remove('header-floating');
                                    this.triggerHeaderStateChange(table as HTMLElement, false);
                                }
                            } catch (error) {
                                console.error('Sticky Table Headers: Error in preview scroll handler', error);
                            }
                        };

                        // Store handler reference for cleanup
                        this.scrollHandlers.push({
                            element: previewView,
                            handler: scrollHandler
                        });

                        previewView.addEventListener('scroll', scrollHandler, { passive: true });

                        // Initial check
                        const headerRect = thead.getBoundingClientRect();
                        const previewRect = previewView.getBoundingClientRect();
                        if (headerRect.top < previewRect.top) {
                            (table as HTMLElement).classList.add('header-floating');
                            this.triggerHeaderStateChange(table as HTMLElement, true);
                        }
                    } catch (error) {
                        console.error('Sticky Table Headers: Error processing table in preview', error);
                    }
                });
            } catch (error) {
                console.error('Sticky Table Headers: Error in markdown post processor', error);
            }
        });

		this.registerEvent(
			this.app.workspace.on("css-change", () => {
				// if --file-margins-top doesn't exist on body,
				// check if --file-margins exists on body, and then
				// extract just the "top" value.
				// if --file-margins doesn't exist, don't set --file-margins-top

				const varBase = document.body;

				const fileMargins = getComputedStyle(varBase)
					.getPropertyValue("--file-margins")
					.trim();
				const fileMarginsTop = getComputedStyle(varBase)
					.getPropertyValue("--file-margins-top")
					.trim();

				if ((!fileMarginsTop) && fileMargins) {
					// We have file-margins, but not file-margins-top
					// Let's figure out what it should be, and create it.
					const fileMarginsArray = fileMargins.split(" ");
					const fileMarginsTop = fileMarginsArray[0];
					varBase.style.setProperty("--file-margins-top", fileMarginsTop);
				}
			})
		);

        // Notify Style Settings about new plugin
        this.app.workspace.trigger("parse-style-settings");
    }

    private triggerHeaderStateChange(table: HTMLElement, isFloating: boolean) {
        try {
            const event = new CustomEvent('table-header-float', {
                detail: {
                    table: table,
                    isFloating: isFloating
                },
                bubbles: true
            });
            table.dispatchEvent(event);
        } catch (error) {
            console.error('Sticky Table Headers: Error triggering header state change', error);
        }
    }

    onunload() {
        // Clean up observers
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.error('Sticky Table Headers: Error disconnecting observer', error);
            }
        });
        this.observers = [];

        // Clean up scroll event listeners
        this.scrollHandlers.forEach(({element, handler}) => {
            try {
                element.removeEventListener('scroll', handler);
            } catch (error) {
                console.error('Sticky Table Headers: Error removing scroll listener', error);
            }
        });
        this.scrollHandlers = [];

        // Remove floating classes
        try {
            document.querySelectorAll('.header-floating').forEach(el => {
                try {
                    (el as HTMLElement).classList.remove('header-floating');
                } catch (error) {
                    console.error('Sticky Table Headers: Error removing floating class from element', error);
                }
            });
        } catch (error) {
            console.error('Sticky Table Headers: Error removing floating classes', error);
        }
    }
}
