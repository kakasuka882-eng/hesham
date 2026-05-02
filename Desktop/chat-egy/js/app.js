document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('postForm');
    const postsContainer = document.getElementById('postsContainer');

    // جلب المنشورات من التخزين المحلي (للتجربة بدون قواعد بيانات حقيقية)
    let posts = JSON.parse(localStorage.getItem('chatEgyPosts')) || [];

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
                <div class="post-author">${escapeHTML(post.author)}</div>
                <time class="post-time">${new Date(post.date).toLocaleString('ar-EG')}</time>
                <div class="post-content">${escapeHTML(post.content)}</div>
                <div class="post-actions">
                    <button class="action-btn ${post.liked ? 'liked' : ''}" onclick="toggleLike(${index})">
                        ${post.liked ? '❤️ أعجبني' : '🤍 إعجاب'} (${post.likes || 0})
                    </button>
                </div>
            `;
            postsContainer.appendChild(article);
        });
    }

    window.toggleLike = function(index) {
        posts[index].liked = !posts[index].liked;
        posts[index].likes = posts[index].liked ? (posts[index].likes || 0) + 1 : (posts[index].likes || 1) - 1;
        localStorage.setItem('chatEgyPosts', JSON.stringify(posts));
        renderPosts();
    };

    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const author = document.getElementById('authorName').value.trim();
        const content = document.getElementById('postContent').value.trim();

        if(author && content) {
            const newPost = { author, content, date: new Date().toISOString(), likes: 0, liked: false };
            posts.unshift(newPost); // إضافة المنشور في الأعلى
            localStorage.setItem('chatEgyPosts', JSON.stringify(posts));
            renderPosts();
            postForm.reset();
        }
    });

    function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])); }
    renderPosts();
});