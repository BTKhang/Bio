document.addEventListener('DOMContentLoaded', () => {
    const loadingBar = document.getElementById('loading-bar');
    const overlay = document.getElementById('welcome-overlay');
    const body = document.body;
    const container = document.getElementById('profileContainer');
    const topBgHalf = document.querySelector('.top-bg-half');
    const bottomBgHalf = document.querySelector('.bottom-bg-half');
    const elements = document.querySelectorAll('[data-parallax]');


    const canvas = document.getElementById('matrix-background');
    const ctx = canvas.getContext('2d');

    let w, h;
    let cols;
    let ypos;
    const matrixColor = '#00bcd4';
    const fontSize = 16;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*()_+=-{}[]:;"|<>,./?';

    function initMatrix() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;

        cols = Math.floor(w / fontSize);
        ypos = Array(cols).fill(0);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
    }

    function matrixLoop() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = matrixColor;
        ctx.font = fontSize + 'pt Space Mono';

        ypos.forEach((y, ind) => {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            const x = ind * fontSize;
            ctx.fillText(text, x, y);

            if (y > h + Math.random() * 10000) {
                ypos[ind] = 0;
            } else {
                ypos[ind] = y + fontSize;
            }
        });
        requestAnimationFrame(matrixLoop);
    }

    initMatrix();
    window.onresize = initMatrix;
    matrixLoop();


    let width = 0;
    const interval = setInterval(() => {
        if (width < 100) { width += 5; loadingBar.style.width = width + '%'; }
        else {
            clearInterval(interval);
            setTimeout(() => {
                loadingBar.style.opacity = '0';
                body.classList.remove('loading');
                overlay.style.opacity = '1';
            }, 500);
        }
    }, 50);


    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const totalHeight = window.innerHeight * 2;

        let scrollRatio = Math.min(1, scrollPosition / totalHeight);

        const autoCompleteThreshold = 0.8;
        if (scrollRatio > autoCompleteThreshold && scrollRatio < 1) {
            scrollRatio = 1;
            window.scrollTo({
                top: totalHeight,
                behavior: 'smooth'
            });
        }

        if (scrollRatio > 0.01) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }

        const scaleValue = 0.3 + (scrollRatio * 0.7);
        const opacityValue = Math.min(1, scrollRatio * 3);


        const moveOffset = scrollRatio * 100;

        topBgHalf.style.transform = `translate(${moveOffset}%, ${-moveOffset}%)`;

        bottomBgHalf.style.transform = `translate(${-moveOffset}%, ${moveOffset}%)`;


        container.style.transform = `translate(-50%, -50%) scale(${scaleValue})`;
        container.style.opacity = opacityValue;
    });


    container.addEventListener('mousemove', (e) => {
        if (window.scrollY / (window.innerHeight * 2) > 0.9) {
            const rect = container.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const mouseX = e.clientX - rect.left - centerX;
            const mouseY = e.clientY - rect.top - centerY;

            const rotateY = (mouseX / centerX) * -3;
            const rotateX = (mouseY / centerY) * 3;

            container.style.transform = `translate(-50%, -50%) scale(1) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

            elements.forEach(element => {
                const strength = parseFloat(element.getAttribute('data-parallax'));
                const moveX = (mouseX * strength * -1);
                const moveY = (mouseY * strength * -1);

                element.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
            });
        }
    });

    container.addEventListener('mouseleave', () => {
        if (window.scrollY / (window.innerHeight * 2) > 0.9) {
            container.style.transform = `translate(-50%, -50%) scale(1) perspective(1000px) rotateX(0deg) rotateY(0deg)`;
            elements.forEach(element => {
                element.style.transform = 'translate3d(0, 0, 0)';
            });
        }
    });


    const modal = document.getElementById("unifiedModal");
    const closeButton = document.querySelector(".close-button-cyber");
    const modalTitle = document.getElementById("modalTitle");
    const modalInstruction = document.getElementById("modalInstruction");
    const modalDetailsText = document.getElementById("modalDetailsText");
    const modalActionButton = document.getElementById("modalActionButton");
    const socialLinks = document.querySelectorAll(".social-hud-link");

    const emailFormContainer = document.getElementById("emailFormContainer");
    const contactForm = document.getElementById("contactForm");
    const formMessage = document.getElementById("formMessage");


    const socialData = {
        'icon-facebook': {
            title: "KẾT NỐI FACEBOOK",
            details: "Tên người dùng: Bùi Tấn Khang",
            instruction: "Nhấn 'MỞ LIÊN KẾT' để truy cập trang cá nhân.",
            url: "https://www.facebook.com/buitan.khang0206",
            isForm: false
        },
        'icon-zalo': {
            title: "KẾT NỐI ZALO",
            details: "Số Zalo: 09XX XXX XXX",
            instruction: "Để bảo mật, vui lòng nhấn mở liên kết để truy cập.",
            url: "https://zalo.me/0971642189",
            isForm: false
        },
        'icon-email': {
            title: "GỬI EMAIL TRỰC TIẾP",
            details: "Email: your.email@example.com",
            instruction: "Bạn có thể gửi tin nhắn ngay tại đây. Tôi sẽ phản hồi sớm nhất có thể.",
            url: "mailto:your.email@example.com",
            isForm: true
        },
        'icon-tiktok': {
            title: "MỞ TIKTOK",
            details: "Tên tài khoản: ⓘ",
            instruction: "Vui lòng nhấn mở liên kết để truy cập.",
            url: "https://tiktok.com/@t.k0206",
            isForm: false
        },
        'icon-discord': {
            title: "THAM GIA DISCORD",
            details: "Tên người dùng: kʜᴀɴɢ",
            instruction: "Vui lòng nhấn mở liên kết để truy cập.",
            url: "https://discordapp.com/users/818502525991780353",
            isForm: false
        },
        'icon-instagram': {
            title: "THEO DÕI INSTAGRAM",
            details: "Tên người dùng: Bùi Tấn Khang",
            instruction: "Vui lòng nhấn mở liên kết để truy cập.",
            url: "https://instagram.com/buitan.khang0206",
            isForm: false
        },
        'icon-github': {
            title: "XEM GITHUB",
            details: "Tên tài khoản: Bùi Tấn Khang",
            instruction: "Vui lòng nhấn mở liên kết để truy cập.",
            url: "https://github.com/BTKhang",
            isForm: false
        }
    };

    socialLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const iconClass = Array.from(this.classList).find(cls => cls.startsWith('icon-'));
            const data = socialData[iconClass];

            if (data) {
                modalDetailsText.style.display = 'block';
                modalActionButton.style.display = 'block';
                emailFormContainer.style.display = 'none';
                contactForm.reset();
                formMessage.textContent = '';


                modalTitle.textContent = data.title;
                modalInstruction.textContent = data.instruction;

                if (data.isForm) {
                    modalDetailsText.style.display = 'none';
                    modalActionButton.style.display = 'none';
                    emailFormContainer.style.display = 'block';

                } else {
                    modalDetailsText.textContent = data.details;
                    modalDetailsText.style.color = iconClass === 'icon-zalo' ? '#0099ff' : 'white';

                    modalActionButton.href = data.url;
                }

                modal.style.display = "block";
            }
        });
    });


    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const status = formMessage;
        const button = this.querySelector('#formSubmitButton');

        button.disabled = true;
        button.textContent = "Đang Gửi...";

        try {
            const response = await fetch(contactForm.action, {
                method: contactForm.method,
                body: new FormData(contactForm),
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                status.textContent = "Email đã được gửi thành công! Cảm ơn bạn.";
                contactForm.reset();
            } else {
                status.textContent = "Gửi thất bại. Vui lòng thử lại sau.";
            }
        } catch (error) {
            status.textContent = "Lỗi kết nối. Vui lòng kiểm tra internet.";
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.textContent = "GỬI EMAIL";
            }, 3000);
        }
    });


    closeButton.addEventListener('click', function() {
        modal.style.display = "none";
        contactForm.reset();
        formMessage.textContent = '';
    });

    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            contactForm.reset();
            formMessage.textContent = '';
        }
    });


    document.querySelectorAll('[data-ripple]').forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.classList.add('ripple-circle');
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            this.appendChild(ripple);

            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        });
    });
});