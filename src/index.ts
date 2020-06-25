import {Octokit} from '@octokit/core';
import shell from 'shelljs';
import util from 'util';

import {ACCESS_TOKEN} from './private';
import {forEachSynchronous} from './forEach';

// types
interface GitRepo {
  name: string;
  full_name: string;
  ssh_url: string;
  default_branch: string;
}

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

// git methods
const requestReposPage = async (octokit: Octokit, page: number): Promise<Array<GitRepo>> => {
  const {data} = await octokit.request(`/user/repos?affiliation=owner&page=${page}&per_page=100`);

  return data;
}

const requestRepos = async (octokit: Octokit): Promise<Array<GitRepo>> => {

  // this is hard coded because this is a utility and i know how many repos I have
  const page1 = await requestReposPage(octokit, 1);
  const page2 = await requestReposPage(octokit, 2);

  const all = [...page1, ...page2];

  // truncate for testing purposes
  return [all[0]]; 
};

const cloneRepos = async (repos: Array<GitRepo>) => {
  makeWorkingDirectory();
  await forEachSynchronous(repos, cloneRepo);
  await forEachSynchronous(repos, renameDefaultBranch);
  removeWorkingDirectory();
}

const cloneRepo = async (repo: GitRepo) => {
  log(`Cloning Repo ${repo.full_name}`);

  await shellExec(`git clone ${repo.ssh_url}`);
};

const isMasterTheDefaultBranch = ({default_branch}: GitRepo): boolean => {
  return default_branch === 'master';
}

const renameDefaultBranch = async (repo: GitRepo): Promise<void> => {
  if (!isMasterTheDefaultBranch(repo)) {
    return;
  }

  shell.cd(`./${repo.name}`);
  // await shellExec('git branch -m master main');
  // await shellExec('git push -u origin main');
  shell.git.status();
  shell.cd(`../`);
};

// main loop
const main = async () => {
  const octokit = new Octokit({
    auth: ACCESS_TOKEN,
  });

  log('Getting repos');
  const repos = await requestRepos(octokit);

  log('Cloning Repos');
  await cloneRepos(repos);

  log('Done');
}

main();