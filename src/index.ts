import {Octokit} from '@octokit/rest';
import shell from 'shelljs';
import util from 'util';
import simpleGit, {SimpleGit} from 'simple-git';

import {GitRepo} from './types';
import settings from './private';
import {forEachSynchronous} from './forEach';

// constants
const WORKING_DIR = './working-temp';

// utility
const log = (message: string) => {
  console.log(message); // eslint-disable-line
}

const makeWorkingDirectory = () => {
  shell.mkdir(WORKING_DIR);
  shell.cd(WORKING_DIR);
};

const removeWorkingDirectory = () => {
  log('Cleaning Up');

  shell.cd('../');
  shell.rm('-rf', WORKING_DIR);
}

const shellExec = util.promisify(shell.exec);

const isMasterTheDefaultBranch = ({default_branch}: GitRepo): boolean => {
  return default_branch === 'master';
};

const isRepoEmpty = (repoDir: string): boolean => {
  return shell.ls(repoDir).length === 0;
}

// git methods
const requestReposPage = async (octokit: Octokit, page: number): Promise<Array<GitRepo>> => {
  const {data} = await octokit.request(`/user/repos?affiliation=owner&page=${page}&per_page=100`);

  return data;
}

const requestRepos = async (octokit: Octokit): Promise<Array<GitRepo>> => {

  // this is hard coded because this is a utility and i know how many repos I have
  const page1 = await requestReposPage(octokit, 1);
  const page2 = await requestReposPage(octokit, 2);

  return [...page1, ...page2];
};

const cloneRepos = async (octokit: Octokit, repos: Array<GitRepo>) => {
  makeWorkingDirectory();
  await forEachSynchronous(repos, renameDefaultBranch(octokit));
  removeWorkingDirectory();
};

const renameDefaultBranch = (octokit: Octokit) => async (repo: GitRepo): Promise<void> => {
  if (!isMasterTheDefaultBranch(repo)) {
    log(`${repo.full_name} already has a default branch of ${repo.default_branch}`);
    return;
  }

  const REPO_DIR = `./${repo.name}`;

  // clone
  await shellExec(`git clone ${repo.ssh_url}`);

  // check if the repo is empty
  if (isRepoEmpty(REPO_DIR)) {
    log(`${repo.full_name} is an empty repository`);
    return;
  }

  // move branch
  const git: SimpleGit = simpleGit(REPO_DIR);
  await git.branch(['-m', 'master', 'main']);
  await git.push('origin', 'main', ['u']);

  // change default
  await octokit.request(`/repos/${repo.owner.login}/${repo.name}`, {
    method: 'PATCH',
    data: {'default_branch': 'main'}
  });
};

// main loop
const main = async () => {
  const octokit = new Octokit({
    auth: settings.ACCESS_TOKEN,
  });

  log('Getting repos');
  const repos = await requestRepos(octokit);

  log('Cloning Repos');
  await cloneRepos(octokit, repos);

  log('Done');
}

main();