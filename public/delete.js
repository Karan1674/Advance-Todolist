
    const handleDelete = (taskId) => {
      event.stopPropagation();
      const popup = document.querySelector('#popup');
      popup.classList.remove('hidden');
      const nobtn = document.querySelector('#no');
      const yesbtn = document.querySelector('#yes');

      nobtn.addEventListener('click', () => {
        popup.classList.add('hidden');
      });
      yesbtn.addEventListener('click', async () =>

{
        popup.classList.add('hidden');

        try {
          const response = await fetch('/deletetask/' + taskId, {
            method: 'POST'
          });

          if (response.ok) {
            window.location.reload();
          } else {
            alert("Failed to delete task");
          }
        } catch (error) {
          console.error("Error deleting task:", error);
          alert("Error occurred while deleting");
        }
      });
    };