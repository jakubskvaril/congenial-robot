import { describe, expect, it } from 'vitest';
import { getProjectRoute, isProjectInProgress } from './status';

describe('getProjectRoute', () => {
  it('routes DRAFT/UPLOADING projects to the upload step', () => {
    expect(getProjectRoute({ id: '1', status: 'DRAFT' })).toBe('/dashboard/projects/1/upload');
    expect(getProjectRoute({ id: '1', status: 'UPLOADING' })).toBe('/dashboard/projects/1/upload');
  });

  it('routes analysis/layout statuses to the rooms step', () => {
    expect(getProjectRoute({ id: '1', status: 'ANALYZING' })).toBe('/dashboard/projects/1/rooms');
    expect(getProjectRoute({ id: '1', status: 'LAYOUT_READY' })).toBe('/dashboard/projects/1/rooms');
  });

  it('routes camera/prompt statuses to the generate step', () => {
    expect(getProjectRoute({ id: '1', status: 'PLANNING_CAMERA' })).toBe('/dashboard/projects/1/generate');
    expect(getProjectRoute({ id: '1', status: 'PROMPT_READY' })).toBe('/dashboard/projects/1/generate');
  });

  it('routes terminal statuses to the result step', () => {
    expect(getProjectRoute({ id: '1', status: 'GENERATING_VIDEO' })).toBe('/dashboard/projects/1/result');
    expect(getProjectRoute({ id: '1', status: 'COMPLETED' })).toBe('/dashboard/projects/1/result');
    expect(getProjectRoute({ id: '1', status: 'FAILED' })).toBe('/dashboard/projects/1/result');
  });
});

describe('isProjectInProgress', () => {
  it('is true only for actively-running pipeline stages', () => {
    expect(isProjectInProgress('ANALYZING')).toBe(true);
    expect(isProjectInProgress('GENERATING_VIDEO')).toBe(true);
    expect(isProjectInProgress('COMPLETED')).toBe(false);
    expect(isProjectInProgress('DRAFT')).toBe(false);
  });
});
