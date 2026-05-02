document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('postForm');
    const postContent = document.getElementById('postContent');
    const postsContainer = document.getElementById('postsContainer');

    let posts = JSON.parse(localStorage.getItem('chatEgyPostsV2')) || [
        { id: 1, author: "أدمن شات إيجي", handle: "@admin", content: "أهلاً بكم في النسخة الجديدة والمطورة من شات إيجي! 🚀", date: new Date().toISOString(), likes: 5, liked: false }
    ];

    function renderPosts() {
        postsContainer.innerHTML = '';
        if(posts.length === 0) {
            postsContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 40px 0;">لا توجد منشورات حتى الآن. كن أول من يكتب!</p>';
            return;
        }

        posts.forEach((post, index) => {
            const article = document.createElement('article');
            article.className = 'post-card';
            article.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar">${post.author.charAt(0)}</div>
                    <div class="post-meta">
                        <strong>${escapeHTML(post.author)}</strong>
                        <span>${escapeHTML(post.handle)} • ${new Date(post.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>
                <div class="post-content">${escapeHTML(post.content)}</div>
                <div class="post-actions">
                    <button class="action-btn">💬 0</button>
                    <button class="action-btn">🔁 0</button>
                    <button class="action-btn ${post.liked ? 'liked' : ''}" onclick="toggleLike(${index})">
                        ${post.liked ? '❤️' : '🤍'} ${post.likes || 0}
                    </button>
                </div>
            `;
            postsContainer.appendChild(article);
        });
    }

    window.toggleLike = function(index) {
        posts[index].liked = !posts[index].liked;
        posts[index].likes = posts[index].liked ? (posts[index].likes || 0) + 1 : (posts[index].likes || 1) - 1;
        localStorage.setItem('chatEgyPostsV2', JSON.stringify(posts));
        renderPosts();
    };

    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = postContent.value.trim();

        if(content) {
            const newPost = { 
                id: Date.now(),
                author: "مستخدم جديد", 
                handle: "@user" + Math.floor(Math.random() * 1000),
                content: content, 
                date: new Date().toISOString(), 
                likes: 0, 
                liked: false 
            };
            posts.unshift(newPost);
            localStorage.setItem('chatEgyPostsV2', JSON.stringify(posts));
            renderPosts();
            postForm.reset();
        }
    });

    function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }
    
    renderPosts();
});