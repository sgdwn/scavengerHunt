// script.js

// Initialize points from localStorage, or start at 0 if not present
let totalPoints = localStorage.getItem('totalPoints') ? parseInt(localStorage.getItem('totalPoints')) : 0;

// Update the UI with the current points
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('total-points').innerText = `Total Points: ${totalPoints}`;
});

async function checkCode() {
    const enteredCode = document.getElementById('code-input').value;

    if (enteredCode.length !== 4) {
        document.getElementById('result').innerHTML = `<span style="color: red;">Please enter a 4-digit code.</span>`;
        return;
    }

    try {
        const response = await fetch('https://scavenger-hunt.sgdwn.workers.dev/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: enteredCode })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.valid) {
                // Update total points
                totalPoints += data.points;
                // Save updated points to localStorage
                localStorage.setItem('totalPoints', totalPoints);
                document.getElementById('result').innerHTML = `<span style="color: green;">Code ${enteredCode} is valid. You earned ${data.points} points!</span>`;
            } else {
                document.getElementById('result').innerHTML = `<span style="color: red;">Code ${enteredCode} is invalid. Try again.</span>`;
            }
            
            // Update the UI with the new points
            document.getElementById('total-points').innerText = `Total Points: ${totalPoints}`;
        } else {
            document.getElementById('result').innerHTML = `<span style="color: red;">Error checking the code. Please try again later.</span>`;
        }
    } catch (error) {
        document.getElementById('result').innerHTML = `<span style="color: red;">Error checking the code. Please try again later.</span>`;
        console.error('Error:', error);
    }
}
