let listeners = [];
let notifications = [];

export function subscribe(listener) {
    listeners.push(listener);
    listener([...notifications]);

    return () => {
        listeners = listeners.filter(
            (item) => item !== listener
        )
    }
}

function update() {
    listeners.forEach((listener) =>
        listener([...notifications])
    )
}

export function notify(
    type, title, message
) {
    const id = Date.now() + Math.random();

    notifications.push({id, type, title, message});

    update();

    setTimeout(() => {
        removeNotification(id);
    }, 4000);
}

export function removeNotification(id) {
    notifications = notifications.filter(
        (notification) => notification.id !== id
    );
}