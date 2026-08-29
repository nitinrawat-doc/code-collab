/**
 * controllers/github.controller.js
 *
 * Secure server-side GitHub Integration endpoints.
 * Credentials remain server-side or are passed directly via secure auth header.
 */

const axios = require('axios');
const ApiError = require('../utils/ApiError');

/**
 * Fetch GitHub user repositories
 */
const getRepos = async (req, res, next) => {
  try {
    const githubToken = req.headers['x-github-token'] || req.query.token;
    if (!githubToken) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'No GitHub token provided. Provide a token or connect account.',
        repos: [],
      });
    }

    const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CodeCollab-App',
      },
    });

    const repos = response.data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      defaultBranch: r.default_branch,
      private: r.private,
      htmlUrl: r.html_url,
    }));

    res.json({ success: true, authenticated: true, repos });
  } catch (err) {
    if (err.response?.status === 401) {
      return next(ApiError.unauthorized('Invalid or expired GitHub Token'));
    }
    next(err);
  }
};

/**
 * Fetch repository branches
 */
const getBranches = async (req, res, next) => {
  try {
    const { owner, repo } = req.query;
    const githubToken = req.headers['x-github-token'];

    if (!owner || !repo) {
      return next(ApiError.badRequest('Owner and repo parameters are required'));
    }

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeCollab-App',
    };
    if (githubToken) headers.Authorization = `token ${githubToken}`;

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers });
    const branches = response.data.map((b) => b.name);

    res.json({ success: true, branches });
  } catch (err) {
    next(err);
  }
};

/**
 * Securely Commit and Push changes to GitHub repository
 */
const commitAndPush = async (req, res, next) => {
  try {
    const { owner, repo, branch, commitMessage, files } = req.body;
    const githubToken = req.headers['x-github-token'];

    if (!githubToken) {
      return next(ApiError.unauthorized('GitHub token is required to commit and push'));
    }

    if (!owner || !repo || !branch || !commitMessage || !Array.isArray(files) || files.length === 0) {
      return next(ApiError.badRequest('Invalid commit parameters (owner, repo, branch, commitMessage, files required)'));
    }

    const headers = {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeCollab-App',
    };

    // 1. Get latest commit SHA of the branch
    const refRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
    const latestCommitSha = refRes.data.object.sha;

    // 2. Get tree SHA of the latest commit
    const commitRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    const baseTreeSha = commitRes.data.tree.sha;

    // 3. Create blobs for modified/added files
    const treeItems = [];
    for (const file of files) {
      const blobRes = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        content: file.content || '',
        encoding: 'utf-8',
      }, { headers });

      treeItems.push({
        path: file.path.replace(/^\//, ''),
        mode: '100644',
        type: 'blob',
        sha: blobRes.data.sha,
      });
    }

    // 4. Create new tree
    const newTreeRes = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      base_tree: baseTreeSha,
      tree: treeItems,
    }, { headers });

    const newTreeSha = newTreeRes.data.sha;

    // 5. Create new commit
    const newCommitRes = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      message: commitMessage,
      tree: newTreeSha,
      parents: [latestCommitSha],
    }, { headers });

    const newCommitSha = newCommitRes.data.sha;

    // 6. Update branch reference (push commit)
    await axios.patch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      sha: newCommitSha,
      force: false,
    }, { headers });

    res.json({
      success: true,
      message: `Successfully committed and pushed ${files.length} file(s) to ${owner}/${repo} (${branch})`,
      commitSha: newCommitSha,
      htmlUrl: `https://github.com/${owner}/${repo}/commit/${newCommitSha}`,
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    next(ApiError.badRequest(`GitHub Push Failed: ${detail}`));
  }
};

module.exports = { getRepos, getBranches, commitAndPush };
