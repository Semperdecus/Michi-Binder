const CONFIRM_VALUE = 'confirm';

const ConfirmDialog = {
  ask({ title, message, confirmLabel }) {
    const dialog = document.getElementById('confirm');
    dialog.querySelector('#confirm-title').textContent = title;
    dialog.querySelector('#confirm-message').textContent = message;
    dialog.querySelector('#confirm-ok').textContent = confirmLabel;
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === CONFIRM_VALUE), { once: true });
    });
  },
};
