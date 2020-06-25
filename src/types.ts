export interface PrivateSettings {
  ACCESS_TOKEN: string;
}

export interface GitRepoOwner {
  login: string;
}

export interface GitRepo {
  owner: GitRepoOwner;
  name: string;
  full_name: string;
  ssh_url: string;
  default_branch: string;
}

